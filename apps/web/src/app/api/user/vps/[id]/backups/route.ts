import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(id), userId: auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS is not provisioned" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });
    
    const backupStorage = server.backupStorage;
    if (!backupStorage) return NextResponse.json({ error: "Backup storage is not configured by the administrator." }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    const backupList = await proxmox.getBackups(vps.node, backupStorage, vps.vmid);

    let totalBytes = 0;
    const backups = (backupList || []).map((b: any) => {
      totalBytes += b.size || 0;
      return {
        volume: b.volid,
        size: b.size,
        format: b.format,
        ctime: b.ctime,
        notes: b.notes || ""
      };
    });

    return NextResponse.json({
      success: true,
      quotaGb: vps.backupGb,
      usedBytes: totalBytes,
      backups: backups.sort((a: any, b: any) => b.ctime - a.ctime) // Newest first
    });
  } catch (error: any) {
    console.error("Get backups error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch backups" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(id), userId: auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS is not provisioned" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });
    
    if (vps.backupGb <= 0) {
      return NextResponse.json({ error: "Backup Addon is not enabled for this VPS" }, { status: 403 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });
    
    const backupStorage = server.backupStorage;
    if (!backupStorage) return NextResponse.json({ error: "Backup storage is not configured by the administrator." }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    
    // Check quota
    const backupList = await proxmox.getBackups(vps.node, backupStorage, vps.vmid);
    let totalBytes = 0;
    (backupList || []).forEach((b: any) => { totalBytes += b.size || 0; });
    
    // Check backup count limit
    if ((backupList || []).length >= 2) {
      return NextResponse.json({ 
        error: "Anda telah mencapai batas maksimal 2 file Backup. Silakan hapus backup lama terlebih dahulu." 
      }, { status: 403 });
    }

    const quotaBytes = vps.backupGb * 1024 * 1024 * 1024;
    if (totalBytes >= quotaBytes) {
      return NextResponse.json({ 
        error: `Backup quota exceeded (${(totalBytes / 1024 / 1024 / 1024).toFixed(2)}GB / ${vps.backupGb}GB). Please delete old backups first.` 
      }, { status: 403 });
    }

    const task = await proxmox.createBackup(vps.node, vps.vmid, backupStorage);
    
    return NextResponse.json({ success: true, upid: task });
  } catch (error: any) {
    console.error("Create backup error:", error);
    return NextResponse.json({ error: error.message || "Failed to create backup" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const url = new URL(req.url);
    const volume = url.searchParams.get("volume");
    if (!volume) return NextResponse.json({ error: "Volume parameter is required" }, { status: 400 });

    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(id), userId: auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS is not provisioned" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });
    
    const backupStorage = server.backupStorage;
    if (!backupStorage) return NextResponse.json({ error: "Backup storage is not configured by the administrator." }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    // Security: Verify the requested volume actually belongs to this VPS (VMID-based ownership check)
    // This prevents a user from crafting a volume string to delete backups from another VM
    const existingBackups = await proxmox.getBackups(vps.node, backupStorage, vps.vmid);
    const backupBelongsToVps = (existingBackups || []).some((b: any) => b.volid === volume);
    if (!backupBelongsToVps) {
      return NextResponse.json({ error: "Backup not found or does not belong to this VPS" }, { status: 403 });
    }

    await proxmox.deleteBackup(vps.node, backupStorage, volume);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete backup error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete backup" }, { status: 500 });
  }
}
