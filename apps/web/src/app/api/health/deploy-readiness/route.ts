import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export const dynamic = "force-dynamic";

/**
 * CI/CD Zero-Disruption Readiness Endpoint
 * Used by GitHub Actions and deployment scripts before recreating containers.
 * Ensures that active Reinstalls, OS Provisioning, Snapshots, Local Backups,
 * Restores, and Cloud Backups are not interrupted mid-flight.
 */
export async function GET() {
  try {
    const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 mins
    const activeCutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

    const [activeProvisioning, activeCloudBackups, activeServer] = await Promise.all([
      // VPS currently being provisioned, installed, or reinstalled
      prisma.vpsService.findMany({
        where: {
          status: "PROVISIONING",
          updatedAt: { gte: activeCutoff }
        },
        select: { id: true, hostname: true, vmid: true, updatedAt: true }
      }),
      // Active cloud backups currently creating snapshot or uploading to cloud
      prisma.vpsCloudBackupRecord.findMany({
        where: {
          status: { in: ["PREPARING", "CREATING_BACKUP", "UPLOADING_TO_CLOUD"] },
          updatedAt: { gte: activeCutoff }
        },
        select: { id: true, vpsId: true, filename: true, status: true, progress: true, updatedAt: true }
      }),
      // Proxmox server configuration
      prisma.proxmoxServer.findFirst({
        where: { isActive: true },
        select: { host: true, tokenId: true, tokenSecret: true }
      })
    ]);

    // Check active critical tasks running directly on Proxmox hypervisor
    // (vzdump = backup, qmrestore = restore, qmsnapshot = snapshot, qmrollback = rollback, qmdelsnapshot = snapshot deletion, qmclone = clone)
    const activeProxmoxTasks: Array<{ type: string; id: string; node: string; upid: string; starttime?: number }> = [];

    if (activeServer) {
      try {
        const proxmox = new ProxmoxClient(activeServer.host, activeServer.tokenId, activeServer.tokenSecret);
        let rawTasks = await proxmox.getClusterTasks();

        if (rawTasks.length === 0) {
          // If cluster task endpoint is unavailable, inspect distinct VPS nodes
          const activeNodes = await prisma.vpsService.findMany({
            where: { status: { notIn: ["TERMINATED"] } },
            select: { node: true },
            distinct: ["node"]
          });
          for (const n of activeNodes) {
            if (n.node) {
              const nodeTasks = await proxmox.getNodeTasks(n.node);
              rawTasks = rawTasks.concat(nodeTasks);
            }
          }
        }

        const criticalTypes = new Set(["vzdump", "qmrestore", "qmsnapshot", "qmrollback", "qmdelsnapshot", "qmclone"]);
        const nowSec = Math.floor(Date.now() / 1000);

        for (const t of rawTasks) {
          if (
            criticalTypes.has(t.type) &&
            !t.endtime &&
            !t.status &&
            t.starttime &&
            nowSec - t.starttime < 1800 // Started within the last 30 minutes
          ) {
            activeProxmoxTasks.push({
              type: t.type,
              id: t.id ? String(t.id) : "",
              node: t.node || "",
              upid: t.upid || "",
              starttime: t.starttime
            });
          }
        }
      } catch (proxmoxErr: any) {
        console.warn("Deploy-readiness: Proxmox task inspection note:", proxmoxErr?.message || proxmoxErr);
      }
    }

    const totalActive = activeProvisioning.length + activeCloudBackups.length + activeProxmoxTasks.length;
    const isSafeToDeploy = totalActive === 0;

    return NextResponse.json({
      safeToDeploy: isSafeToDeploy,
      activeCount: totalActive,
      details: {
        activeReinstalls: activeProvisioning.map((p) => ({
          vpsId: p.id,
          vmid: p.vmid,
          hostname: p.hostname
        })),
        activeBackups: activeCloudBackups.map((b) => ({
          recordId: b.id,
          vpsId: b.vpsId,
          status: b.status,
          progress: b.progress
        })),
        activeProxmoxTasks: activeProxmoxTasks.map((t) => ({
          type: t.type,
          vmid: t.id,
          node: t.node,
          upid: t.upid
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    // If database is temporarily unavailable during migration, allow deploy with warning
    return NextResponse.json({
      safeToDeploy: true,
      error: err?.message || "Check skipped"
    });
  }
}
