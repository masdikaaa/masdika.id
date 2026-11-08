import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

const VOLUME_REGEX = /^([a-zA-Z0-9_-]+):backup\/vzdump-qemu-(\d+)-\d{4}_\d{2}_\d{2}-\d{2}_\d{2}_\d{2}\.(vma|tar)(\.zst|\.gz|\.lzo)?$/;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vpsId = parseInt(id, 10);
    if (!Number.isSafeInteger(vpsId) || vpsId <= 0) {
      return NextResponse.json({ error: "Invalid VPS ID" }, { status: 400 });
    }

    const { volume } = await req.json();
    if (!volume || typeof volume !== "string") {
      return NextResponse.json({ error: "Volume is required" }, { status: 400 });
    }

    const volumeMatch = volume.match(VOLUME_REGEX);
    if (!volumeMatch) {
      return NextResponse.json({ error: "Invalid backup volume format" }, { status: 400 });
    }

    const vps = await prisma.vpsService.findUnique({
      where: { id: vpsId, userId: auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS is not provisioned" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") {
      return NextResponse.json({ error: "VPS is suspended or terminated. Restore is blocked." }, { status: 403 });
    }

    const volumeStorage = volumeMatch[1];
    const backupVmid = parseInt(volumeMatch[2], 10);
    if (backupVmid !== vps.vmid) {
      return NextResponse.json({ error: "This backup does not belong to your VPS" }, { status: 403 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server || !server.backupStorage) {
      return NextResponse.json({ error: "No active Proxmox backup storage configured" }, { status: 500 });
    }

    if (volumeStorage !== server.backupStorage) {
      return NextResponse.json({ error: "Invalid backup storage pool" }, { status: 403 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    // Verify backup exists in Proxmox AND was created after this VPS was provisioned (prevents recycled-VMID cross-tenant restore)
    const existingBackups = await proxmox.getBackups(vps.node, server.backupStorage, vps.vmid);
    const minCtime = Math.floor(vps.createdAt.getTime() / 1000) - 60;
    const matchedBackup = (existingBackups || []).find(
      (b: any) => b.volid === volume && (!b.ctime || b.ctime >= minCtime)
    );
    if (!matchedBackup) {
      return NextResponse.json({ error: "Backup archive not found or unauthorized" }, { status: 403 });
    }

    // Snapshot current authoritative hardware/network config before restore so older backups cannot inflate CPU/RAM or hijack old IPs
    const preRestoreConfig = await proxmox.getVmConfig(vps.node, vps.vmid).catch(() => ({} as Record<string, any>));
    const enforcedConfig: Record<string, any> = {
      cores: vps.cpuCores,
      memory: vps.ramGb * 1024,
    };
    for (const key of ["net0", "net1", "ipconfig0", "ipconfig1"]) {
      if (preRestoreConfig && preRestoreConfig[key]) {
        enforcedConfig[key] = preRestoreConfig[key];
      }
    }

    // Ensure the VM is stopped before restoring (restoring over a running VM will fail)
    try {
      const status = await proxmox.getVmStatus(vps.node, vps.vmid);
      if (status && status.status === "running") {
        await proxmox.stopVm(vps.node, vps.vmid);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    } catch (e) {
      console.log("Could not check/stop VM before restore (might already be stopped):", e);
    }

    // Trigger restore and enforce authoritative DB CPU/RAM/network once restore task finishes
    const task = await proxmox.restoreBackup(vps.node, vps.vmid, volume);
    const upidStr = typeof task === "string" ? task : task?.data;

    if (upidStr) {
      (async () => {
        try {
          await proxmox.waitForTask(vps.node, upidStr, 300000);
          await proxmox.waitForVmUnlock(vps.node, vps.vmid!, 60000);
          await proxmox.configVm(vps.node, vps.vmid!, enforcedConfig);
        } catch (reapplyErr) {
          console.error(`[Restore] Failed to re-enforce hardware/network limits on VM ${vps.vmid}:`, reapplyErr);
        }
      })();
    }

    return NextResponse.json({ success: true, upid: upidStr });
  } catch (error: any) {
    console.error("Restore backup error:", error);
    return NextResponse.json({ error: error.message || "Failed to restore backup" }, { status: 500 });
  }
}
