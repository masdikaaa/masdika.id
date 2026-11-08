import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vpsId = parseInt(id, 10);
    if (!Number.isSafeInteger(vpsId) || vpsId <= 0) {
      return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });
    }

    const volume = req.nextUrl.searchParams.get("volume");
    if (!volume) {
      return NextResponse.json({ error: "Volume parameter is required" }, { status: 400 });
    }

    // Security: Validate volume format matches Proxmox backup naming (e.g., "local:backup/vzdump-qemu-100-2024_01_01-00_00_00.vma.zst")
    const VOLUME_REGEX = /^([a-zA-Z0-9_-]+):backup\/vzdump-qemu-(\d+)-\d{4}_\d{2}_\d{2}-\d{2}_\d{2}_\d{2}\.(vma|tar)(\.zst|\.gz|\.lzo)?$/;
    const volumeMatch = volume.match(VOLUME_REGEX);
    if (!volumeMatch) {
      return NextResponse.json({ error: "Invalid volume format" }, { status: 400 });
    }

    const vps = await prisma.vpsService.findUnique({
      where: { id: vpsId, userId: auth.userId }
    });

    if (!vps || !vps.vmid) return NextResponse.json({ error: "VPS not found or not provisioned" }, { status: 404 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") {
      return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });
    }

    const volumeStorage = volumeMatch[1];
    const backupVmid = parseInt(volumeMatch[2], 10);
    if (backupVmid !== vps.vmid) {
      return NextResponse.json({ error: "This backup does not belong to your VPS" }, { status: 403 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });
    
    const backupStorage = server.backupStorage;
    if (!backupStorage) return NextResponse.json({ error: "Backup storage is not configured." }, { status: 500 });
    if (volumeStorage !== backupStorage) {
      return NextResponse.json({ error: "Invalid backup storage pool" }, { status: 403 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    // Verify backup belongs to this VPS creation epoch (prevents recycled-VMID data leak)
    const existingBackups = await proxmox.getBackups(vps.node, backupStorage, vps.vmid);
    const minCtime = Math.floor(vps.createdAt.getTime() / 1000) - 60;
    const matchedBackup = (existingBackups || []).find(
      (b: any) => b.volid === volume && (!b.ctime || b.ctime >= minCtime)
    );
    if (!matchedBackup) {
      return NextResponse.json({ error: "Backup not found or unauthorized" }, { status: 403 });
    }

    const rawPath = `/api2/extjs/nodes/${encodeURIComponent(vps.node)}/storage/${encodeURIComponent(backupStorage)}/download?volume=${encodeURIComponent(volume)}`;
    const proxmoxRes = await proxmox.streamRawPath(rawPath);

    if (proxmoxRes.status < 200 || proxmoxRes.status >= 300) {
      const errText = await proxmoxRes.readErrorText();
      return NextResponse.json({ error: "Failed to fetch backup from Proxmox: " + errText }, { status: proxmoxRes.status });
    }

    const safeFilename = (volume.split('/').pop() || 'backup.vma.zst').replace(/[^a-zA-Z0-9._-]/g, '_');
    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${safeFilename}"`);
    const contentType = Array.isArray(proxmoxRes.headers['content-type'])
      ? proxmoxRes.headers['content-type'][0]
      : proxmoxRes.headers['content-type'];
    const contentLength = Array.isArray(proxmoxRes.headers['content-length'])
      ? proxmoxRes.headers['content-length'][0]
      : proxmoxRes.headers['content-length'];
    headers.set('Content-Type', contentType || 'application/octet-stream');
    if (contentLength) {
      headers.set('Content-Length', contentLength);
    }

    return new NextResponse(proxmoxRes.stream, {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error("Download backup error:", error);
    return NextResponse.json({ error: error.message || "Failed to download backup" }, { status: 500 });
  }
}
