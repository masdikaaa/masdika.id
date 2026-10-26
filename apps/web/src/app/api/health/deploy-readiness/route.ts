import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * CI/CD Zero-Disruption Readiness Endpoint
 * Used by GitHub Actions and deployment scripts before recreating containers.
 * Ensures that active Reinstalls, OS Provisioning, and Cloud Backups are not killed mid-stream.
 */
export async function GET() {
  try {
    const STALE_THRESHOLD_MS = 15 * 60 * 1000; // 15 mins
    const activeCutoff = new Date(Date.now() - STALE_THRESHOLD_MS);

    const [activeProvisioning, activeCloudBackups] = await Promise.all([
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
      })
    ]);

    const isSafeToDeploy = activeProvisioning.length === 0 && activeCloudBackups.length === 0;

    return NextResponse.json({
      safeToDeploy: isSafeToDeploy,
      activeCount: activeProvisioning.length + activeCloudBackups.length,
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
