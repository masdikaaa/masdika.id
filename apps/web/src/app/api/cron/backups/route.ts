import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

// This endpoint should be triggered by a cron job (e.g., every hour)
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || !authHeader || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) {
      return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });
    }
    
    const backupStorage = server.backupStorage;
    if (!backupStorage) {
      return NextResponse.json({ error: "Backup storage is not configured" }, { status: 500 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    const vpsList = await prisma.vpsService.findMany({
      where: {
        backupSchedule: { not: "NONE" },
        status: { in: ["RUNNING", "STOPPED"] },
        backupGb: { gt: 0 }
      }
    });

    const now = new Date();
    const results = [];

    for (const vps of vpsList) {
      if (!vps.vmid) continue;

      let isDue = false;
      if (!vps.lastBackupRun) {
        isDue = true;
      } else {
        const hoursSinceLastBackup = (now.getTime() - vps.lastBackupRun.getTime()) / (1000 * 60 * 60);
        if (vps.backupSchedule === "DAILY" && hoursSinceLastBackup >= 24) isDue = true;
        if (vps.backupSchedule === "WEEKLY" && hoursSinceLastBackup >= 24 * 7) isDue = true;
        if (vps.backupSchedule === "MONTHLY" && hoursSinceLastBackup >= 24 * 30) isDue = true;
      }

      if (isDue) {
        try {
          // Check current backups
          const backups = await proxmox.getBackups(vps.node, backupStorage, vps.vmid);
          
          let totalBytes = 0;
          (backups || []).forEach((b: any) => { totalBytes += b.size || 0; });
          
          const quotaBytes = vps.backupGb * 1024 * 1024 * 1024;
          
          // If we already reached quota and we're not rotating, we should skip
          // Actually, if we are rotating, the new total will be totalBytes - oldestBackupSize + newBackupSize.
          // To be safe, if totalBytes >= quotaBytes and we aren't rotating, or if even after rotating we might exceed, 
          // let's just enforce the strict quota check like the manual route.
          if (totalBytes >= quotaBytes && (!backups || backups.length < 2)) {
             console.log(`[Cron] Skipped backup for VM ${vps.vmid}: Quota exceeded`);
             results.push({ vmid: vps.vmid, status: "QUOTA_EXCEEDED" });
             continue; // Skip creating backup
          }
          
          if (backups && backups.length >= 2) {
            // Need to rotate: delete oldest
            const sortedBackups = [...backups].sort((a: any, b: any) => a.ctime - b.ctime); // ascending ctime
            const oldestBackup = sortedBackups[0];
            await proxmox.deleteBackup(vps.node, backupStorage, oldestBackup.volid);
            console.log(`[Cron] Rotated (deleted) old backup ${oldestBackup.volid} for VM ${vps.vmid}`);
            totalBytes -= oldestBackup.size || 0;
          }

          // Strict quota check after rotation
          if (totalBytes >= quotaBytes) {
             console.log(`[Cron] Skipped backup for VM ${vps.vmid}: Quota exceeded even after rotation`);
             results.push({ vmid: vps.vmid, status: "QUOTA_EXCEEDED" });
             continue;
          }

          // Trigger new backup
          await proxmox.createBackup(vps.node, vps.vmid, backupStorage);
          console.log(`[Cron] Started automated backup for VM ${vps.vmid}`);

          // Update last run
          await prisma.vpsService.update({
            where: { id: vps.id },
            data: { lastBackupRun: now }
          });

          results.push({ vmid: vps.vmid, status: "BACKUP_STARTED" });
        } catch (err: any) {
          console.error(`[Cron] Failed to backup VM ${vps.vmid}:`, err);
          results.push({ vmid: vps.vmid, status: "ERROR", error: err.message });
        }
      } else {
        results.push({ vmid: vps.vmid, status: "NOT_DUE" });
      }
    }

    return NextResponse.json({ success: true, processed: results.length, results });
  } catch (error: any) {
    console.error("[Cron] Automated Backups error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
