import { prisma } from "./prisma";
import { ProxmoxClient } from "./proxmox";

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
