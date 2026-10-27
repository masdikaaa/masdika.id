import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id, recordId } = await params;
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(id), userId: auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS is not provisioned with a VM ID" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") {
      return NextResponse.json({ error: "VPS is suspended or terminated. Restore is blocked." }, { status: 403 });
    }

    const record = await prisma.vpsCloudBackupRecord.findUnique({
      where: { id: parseInt(recordId), vpsId: vps.id }
    });

    if (!record) return NextResponse.json({ error: "Backup record not found" }, { status: 404 });
    if (record.status !== "COMPLETED") {
      return NextResponse.json({ error: "Cannot restore: backup has not completed successfully." }, { status: 400 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    // Stop VM if it is running before restoring
    try {
      const status = await proxmox.getVmStatus(vps.node, vps.vmid);
      if (status && status.status === "running") {
        await proxmox.stopVm(vps.node, vps.vmid);
        // Wait up to 12 seconds for VM to stop
        for (let i = 0; i < 8; i++) {
          await new Promise((resolve) => setTimeout(resolve, 1500));
          const current = await proxmox.getVmStatus(vps.node, vps.vmid).catch(() => null);
          if (current && current.status === "stopped") break;
        }
      }
    } catch (e) {
      console.warn("Could not check/stop VM before restore (might already be stopped):", e);
    }

    // Verify backup exists on hypervisor storage
    const localBackups = await proxmox.getBackups(vps.node, "local", vps.vmid).catch(() => []);
    const matchingBackup = (localBackups || []).find(
      (b: any) => b.volid === `local:backup/${record.filename}` || (b.volid && b.volid.endsWith(record.filename))
    );

    const volumeToRestore = matchingBackup ? matchingBackup.volid : `local:backup/${record.filename}`;

    // Trigger Proxmox qemu restore
    try {
      const task = await proxmox.restoreBackup(vps.node, vps.vmid, volumeToRestore);
      return NextResponse.json({
        success: true,
        message: "VPS restore initiated successfully. VM disk and configuration are being restored.",
        upid: task?.data || task
      });
    } catch (restoreErr: any) {
      console.error("Proxmox restore error:", restoreErr);
      const errStr = restoreErr?.message || String(restoreErr);
      if (errStr.includes("does not exist") || errStr.includes("No such file")) {
        return NextResponse.json(
          {
            error: `Arsip backup (${record.filename}) tidak ditemukan di storage lokal hypervisor. Silakan unduh file arsip dari cloud (${record.provider}) dan hubungi bantuan teknis.`
          },
          { status: 404 }
        );
      }
      return NextResponse.json({ error: restoreErr.message || "Failed to restore backup on Proxmox" }, { status: 500 });
    }
  } catch (error: any) {
    console.error("Cloud restore error:", error);
    return NextResponse.json({ error: error.message || "Failed to initiate restore" }, { status: 500 });
  }
}
