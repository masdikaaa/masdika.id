import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

const SNAPSHOT_NAME_REGEX = /^[a-zA-Z][a-zA-Z0-9_-]{1,39}$/;

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string, snapname: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId!;
    const user = auth.user!;
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    const { id, snapname } = await params;
    const vpsId = parseInt(id, 10);
    if (!Number.isSafeInteger(vpsId) || vpsId <= 0) {
      return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });
    }
    if (!snapname || !SNAPSHOT_NAME_REGEX.test(snapname) || snapname === "current") {
      return NextResponse.json({ error: "Invalid snapshot name" }, { status: 400 });
    }

    const whereClause: any = { id: vpsId };
    if (!isAdmin) {
      whereClause.userId = userId;
    }

    const vps = await prisma.vpsService.findFirst({
      where: whereClause
    });

    if (!vps || !vps.vmid) {
      return NextResponse.json({ error: "VPS not found or not provisioned" }, { status: 404 });
    }
    if (!isAdmin && (vps.status === "SUSPENDED" || vps.status === "TERMINATED")) {
      return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "Proxmox server not found" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    const result = await proxmox.deleteVMSnapshot(vps.node, vps.vmid, snapname);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("DELETE VPS snapshot error:", error);
    return NextResponse.json({ error: error?.message || "Failed to delete snapshot" }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string, snapname: string }> }) {
  // Rollback action
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId!;
    const user = auth.user!;
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    const { id, snapname } = await params;
    const vpsId = parseInt(id, 10);
    if (!Number.isSafeInteger(vpsId) || vpsId <= 0) {
      return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });
    }
    if (!snapname || !SNAPSHOT_NAME_REGEX.test(snapname) || snapname === "current") {
      return NextResponse.json({ error: "Invalid snapshot name" }, { status: 400 });
    }

    const whereClause: any = { id: vpsId };
    if (!isAdmin) {
      whereClause.userId = userId;
    }

    const vps = await prisma.vpsService.findFirst({
      where: whereClause
    });

    if (!vps || !vps.vmid) {
      return NextResponse.json({ error: "VPS not found or not provisioned" }, { status: 404 });
    }
    if (!isAdmin && (vps.status === "SUSPENDED" || vps.status === "TERMINATED")) {
      return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "Proxmox server not found" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    // Preserve authoritative DB CPU/RAM and current NIC config so rolling back an older snapshot cannot inflate resources
    const preRollbackConfig = await proxmox.getVmConfig(vps.node, vps.vmid).catch(() => ({} as Record<string, any>));
    const enforcedConfig: Record<string, any> = {
      cores: vps.cpuCores,
      memory: vps.ramGb * 1024,
    };
    for (const key of ["net0", "net1", "ipconfig0", "ipconfig1"]) {
      if (preRollbackConfig && preRollbackConfig[key]) {
        enforcedConfig[key] = preRollbackConfig[key];
      }
    }

    const result = await proxmox.rollbackVMSnapshot(vps.node, vps.vmid, snapname);
    const upidStr = typeof result === "string" ? result : result?.data;

    if (upidStr) {
      (async () => {
        try {
          await proxmox.waitForTask(vps.node, upidStr, 180000);
          await proxmox.waitForVmUnlock(vps.node, vps.vmid!, 60000);
          await proxmox.configVm(vps.node, vps.vmid!, enforcedConfig);
        } catch (reapplyErr) {
          console.error(`[Snapshot Rollback] Failed to re-enforce hardware/network config on VM ${vps.vmid}:`, reapplyErr);
        }
      })();
    }

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("POST VPS snapshot rollback error:", error);
    return NextResponse.json({ error: error?.message || "Failed to rollback snapshot" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string, snapname: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId!;
    const user = auth.user!;
    const isAdmin = user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";

    const { id, snapname } = await params;
    const vpsId = parseInt(id, 10);
    if (!Number.isSafeInteger(vpsId) || vpsId <= 0) {
      return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });
    }
    if (!snapname || !SNAPSHOT_NAME_REGEX.test(snapname) || snapname === "current") {
      return NextResponse.json({ error: "Invalid snapshot name" }, { status: 400 });
    }

    const body = await req.json();
    const safeDesc = typeof body?.description === "string" ? body.description.slice(0, 255) : "";

    const whereClause: any = { id: vpsId };
    if (!isAdmin) {
      whereClause.userId = userId;
    }

    const vps = await prisma.vpsService.findFirst({
      where: whereClause
    });

    if (!vps || !vps.vmid) {
      return NextResponse.json({ error: "VPS not found or not provisioned" }, { status: 404 });
    }
    if (!isAdmin && (vps.status === "SUSPENDED" || vps.status === "TERMINATED")) {
      return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "Proxmox server not found" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    const result = await proxmox.updateVMSnapshot(vps.node, vps.vmid, snapname, safeDesc);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("PUT VPS snapshot error:", error);
    return NextResponse.json({ error: error?.message || "Failed to update snapshot" }, { status: 500 });
  }
}
