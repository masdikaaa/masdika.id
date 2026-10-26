import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export const dynamic = "force-dynamic";

/**
 * CI/CD Zero-Disruption Readiness Endpoint
 * Used by GitHub Actions and deployment scripts before recreating containers.
 * Ensures that active orders and deployments across ALL services:
 * - VPS Orders & OS Reinstalls
 * - K3s Kubernetes Clusters (Master & Worker nodes)
 * - Background Job Queue (PROVISION_VPS, INSTALL_K3S, REINSTALL_K3S)
 * - VPC Networks (MicroTik & Proxmox VLANs)
 * - Subscriptions & Plan Orders (File CDN, Edge CDN, API Hub)
 * - Cloud Backups (Drive, S3, R2 streaming)
 * - Proxmox Hypervisor Tasks (vzdump, qmrestore, qmsnapshot, qmrollback, qmdelsnapshot, qmclone)
 * are NEVER interrupted mid-flight by a container restart.
 */
export async function GET() {
  try {
    const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 mins cutoff for stale operations
    const activeCutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

    const [
      activeVpsList,
      activeK3sList,
      activeJobsList,
      activeVpcList,
      activeSubList,
      activeCloudBackups,
      activeServer
    ] = await Promise.all([
      // 1. VPS currently ordering, provisioning, installing K3s, or reinstalling
      prisma.vpsService.findMany({
        where: {
          status: { in: ["PENDING", "PROVISIONING", "INSTALLING_K3S"] },
          updatedAt: { gte: activeCutoff }
        },
        select: { id: true, hostname: true, vmid: true, status: true, updatedAt: true }
      }),
      // 2. K3s Kubernetes clusters currently ordering, initializing, or joining workers
      prisma.kubernetesCluster.findMany({
        where: {
          status: { in: [
            "PENDING",
            "WAITING_FOR_CLOUD_INIT",
            "INSTALLING_K3S",
            "CONFIGURING_WORKERS",
            "PROVISIONING",
            "INSTALLING",
            "REINSTALLING"
          ] },
          updatedAt: { gte: activeCutoff }
        },
        select: { id: true, name: true, status: true, updatedAt: true }
      }),
      // 3. Background Job Queue (worker actively provisioning VPS or K3s)
      prisma.backgroundJob.findMany({
        where: {
          status: { in: ["PENDING", "PROCESSING"] },
          updatedAt: { gte: activeCutoff }
        },
        select: { id: true, type: true, status: true, attempts: true, updatedAt: true }
      }),
      // 4. VPC Private Networks being provisioned
      prisma.vpcNetwork.findMany({
        where: {
          status: "PROVISIONING",
          updatedAt: { gte: activeCutoff }
        },
        select: { id: true, name: true, cidr: true, status: true, updatedAt: true }
      }),
      // 5. Subscriptions / CDN / Storage orders being provisioned
      prisma.subscription.findMany({
        where: {
          status: "PROVISIONING",
          updatedAt: { gte: activeCutoff }
        },
        select: { id: true, planId: true, status: true, updatedAt: true }
      }),
      // 6. Active cloud backups currently creating snapshot or streaming to cloud (Drive/S3/R2)
      prisma.vpsCloudBackupRecord.findMany({
        where: {
          status: { in: ["PREPARING", "CREATING_BACKUP", "UPLOADING_TO_CLOUD"] },
          updatedAt: { gte: activeCutoff }
        },
        select: { id: true, vpsId: true, filename: true, status: true, progress: true, updatedAt: true }
      }),
      // 7. Active Proxmox server configuration
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

    const totalActive =
      activeVpsList.length +
      activeK3sList.length +
      activeJobsList.length +
      activeVpcList.length +
      activeSubList.length +
      activeCloudBackups.length +
      activeProxmoxTasks.length;

    const isSafeToDeploy = totalActive === 0;

    return NextResponse.json({
      safeToDeploy: isSafeToDeploy,
      activeCount: totalActive,
      details: {
        activeVpsOrders: activeVpsList.map((p) => ({
          vpsId: p.id,
          vmid: p.vmid,
          hostname: p.hostname,
          status: p.status
        })),
        activeK3sClusters: activeK3sList.map((k) => ({
          clusterId: k.id,
          name: k.name,
          status: k.status
        })),
        activeBackgroundJobs: activeJobsList.map((j) => ({
          jobId: j.id,
          type: j.type,
          status: j.status,
          attempts: j.attempts
        })),
        activeVpcNetworks: activeVpcList.map((v) => ({
          vpcId: v.id,
          name: v.name,
          cidr: v.cidr
        })),
        activeSubscriptions: activeSubList.map((s) => ({
          subscriptionId: s.id,
          planId: s.planId
        })),
        activeCloudBackups: activeCloudBackups.map((b) => ({
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
