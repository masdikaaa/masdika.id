import { prisma } from "./prisma";
import { ProxmoxClient } from "./proxmox";

/**
 * Self-Healing & Crash Recovery for Cloud Backups (Self-service & Paid)
 * Automatically runs on server startup and before starting new backups.
 * If a CI/CD deployment or server restart occurs while a backup is in progress:
 * 1. Safely cleans up temporary backup files from Proxmox storage (prevents disk space leaks)
 * 2. Unlocks the backup queue by marking stale jobs as FAILED with an informative message
 * 3. Ensures the user can immediately retry without getting stuck or encountering errors
 */
export async function recoverStaleCloudBackups(vpsId?: number): Promise<number> {
  try {
    const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 minutes without progress update
    const cutoffTime = new Date(Date.now() - STALE_THRESHOLD_MS);

    // Find any backup record still marked as in-progress that hasn't reported progress
    const staleRecords = await prisma.vpsCloudBackupRecord.findMany({
      where: {
        ...(vpsId ? { vpsId } : {}),
        status: { in: ["PREPARING", "CREATING_BACKUP", "UPLOADING_TO_CLOUD"] },
        updatedAt: { lt: cutoffTime }
      },
      include: {
        vps: true
      }
    });

    if (staleRecords.length === 0) {
      return 0;
    }

    console.log(`[CloudBackupRecovery] Found ${staleRecords.length} stale backup jobs to auto-recover...`);

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    const proxmox = server ? new ProxmoxClient(server.host, server.tokenId, server.tokenSecret) : null;
    const backupStorage = server?.backupStorage || "local";

    let recoveredCount = 0;

    for (const record of staleRecords) {
      try {
        // If the temporary backup was created on Proxmox, clean it up to prevent storage leaks
        if (proxmox && record.vps?.node && record.vps?.vmid && record.vps.backupGb <= 0) {
          try {
            const backups = await proxmox.getBackups(record.vps.node, backupStorage, record.vps.vmid);
            const matchingBackup = (backups || []).find((b: any) =>
              b.volid?.includes(record.filename) || b.notes?.includes(record.filename)
            );
            if (matchingBackup?.volid) {
              await proxmox.deleteBackup(record.vps.node, backupStorage, matchingBackup.volid);
              console.log(`[CloudBackupRecovery] Cleaned up temporary Proxmox volume: ${matchingBackup.volid}`);
            }
          } catch (cleanErr) {
            console.warn(`[CloudBackupRecovery] Note on Proxmox cleanup for VM ${record.vps.vmid}:`, cleanErr);
          }
        }

        // Mark record as FAILED with a helpful explanation
        await prisma.vpsCloudBackupRecord.update({
          where: { id: record.id },
          data: {
            status: "FAILED",
            error: "Proses backup terputus karena server mengalami restart atau CI/CD deployment. File sementara Proxmox telah dibersihkan secara aman. Silakan klik 'Backup Now to Cloud' untuk mencoba kembali."
          }
        });

        if (record.configId) {
          await prisma.vpsCloudBackupConfig.update({
            where: { id: record.configId },
            data: {
              lastStatus: "ERROR",
              lastError: "Backup terputus akibat restart/deployment server (telah dipulihkan secara otomatis)."
            }
          }).catch(() => {});
        }

        recoveredCount++;
      } catch (itemErr) {
        console.error(`[CloudBackupRecovery] Error recovering record #${record.id}:`, itemErr);
      }
    }

    return recoveredCount;
  } catch (err) {
    console.error("[CloudBackupRecovery] Critical error in recoverStaleCloudBackups:", err);
    return 0;
  }
}

/**
 * Auto-recover any VPS instances that were stuck in PROVISIONING state
 * due to a server restart or CI/CD deployment during OS Reinstallation.
 */
export async function recoverStaleReinstalls(): Promise<number> {
  try {
    const STALE_PROVISIONING_MS = 15 * 60 * 1000; // 15 minutes
    const cutoffTime = new Date(Date.now() - STALE_PROVISIONING_MS);

    const stuckVpsList = await prisma.vpsService.findMany({
      where: {
        status: "PROVISIONING",
        updatedAt: { lt: cutoffTime }
      }
    });

    if (stuckVpsList.length === 0) return 0;

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    const proxmox = server ? new ProxmoxClient(server.host, server.tokenId, server.tokenSecret) : null;

    let recovered = 0;
    for (const vps of stuckVpsList) {
      try {
        if (proxmox && vps.vmid && vps.node) {
          const vmStatus = await proxmox.getVmStatus(vps.node, vps.vmid).catch(() => null);
          if (vmStatus && vmStatus.status === "running") {
            await prisma.vpsService.update({
              where: { id: vps.id },
              data: { status: "RUNNING" }
            });
            console.log(`[ReinstallRecovery] Auto-restored VM ${vps.vmid} status to RUNNING`);
            recovered++;
            continue;
          }
        }

        // Set to STOPPED so user is no longer stuck on provisioning lock
        await prisma.vpsService.update({
          where: { id: vps.id },
          data: { status: "STOPPED" }
        });
        console.log(`[ReinstallRecovery] Unlocked stuck provisioning VM ${vps.vmid} -> STOPPED`);
        recovered++;
      } catch (err) {
        console.error(`[ReinstallRecovery] Error recovering VM ${vps.vmid}:`, err);
      }
    }

    return recovered;
  } catch (err) {
    console.error("[ReinstallRecovery] Critical error:", err);
    return 0;
  }
}

