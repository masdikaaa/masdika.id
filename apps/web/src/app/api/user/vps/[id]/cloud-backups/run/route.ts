import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import {
  getS3PresignedUploadUrl,
  getS3PresignedDownloadUrl
} from "@/lib/cloud-storage";
import { executeProxmoxHostCommand } from "@/lib/proxmox-exec";
import { recoverStaleCloudBackups } from "@/lib/cloud-backup-recovery";

export const dynamic = "force-dynamic";

// Helper delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(id), userId: auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS is not provisioned with a VM ID" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") {
      return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });
    }

    const config = await prisma.vpsCloudBackupConfig.findUnique({
      where: { vpsId: vps.id }
    });

    if (!config || !config.enabled) {
      return NextResponse.json(
        { error: "Cloud backup is not configured or disabled. Please configure your cloud storage first." },
        { status: 400 }
      );
    }

    // Validate provider credentials (only Cloudflare R2 and AWS S3 supported)
    if (config.provider !== "R2" && config.provider !== "S3") {
      return NextResponse.json(
        { error: "Google Drive is no longer supported. Please configure Cloudflare R2 or AWS S3." },
        { status: 400 }
      );
    }

    if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
      return NextResponse.json(
        { error: `Missing credentials for ${config.provider === "R2" ? "Cloudflare R2" : "AWS S3"}. Please check your settings.` },
        { status: 400 }
      );
    }

    // Auto-recover any stale backups if server was previously restarted during backup
    await recoverStaleCloudBackups(vps.id);

    // Check if another backup is actively running for this VPS
    const existingActive = await prisma.vpsCloudBackupRecord.findFirst({
      where: {
        vpsId: vps.id,
        status: { in: ["PREPARING", "CREATING_BACKUP", "UPLOADING_TO_CLOUD"] }
      }
    });

    if (existingActive) {
      return NextResponse.json(
        { error: "A cloud backup is already in progress for this VPS. Please wait for it to complete." },
        { status: 409 }
      );
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);

    // Default directory-based storage for standalone vzdump archives
    let cloudTempStorage = "local";
    try {
      const storages = await proxmox.getStorages(vps.node);
      const dirStorage = (storages || []).find(
        (s: any) => s.active && s.enabled && s.type !== "pbs" && typeof s.content === "string" && s.content.includes("backup")
      );
      if (dirStorage) {
        cloudTempStorage = dirStorage.storage;
      }
    } catch {
      cloudTempStorage = "local";
    }

    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    const pveDateStr = `${now.getFullYear()}_${pad(now.getMonth() + 1)}_${pad(now.getDate())}-${pad(now.getHours())}_${pad(now.getMinutes())}_${pad(now.getSeconds())}`;
    const standardFilename = `vzdump-qemu-${vps.vmid}-${pveDateStr}.vma.zst`;
    const targetKey = `${config.pathPrefix || `vps-${vps.vmid}`}/${standardFilename}`;

    // Create tracking record
    const record = await prisma.vpsCloudBackupRecord.create({
      data: {
        vpsId: vps.id,
        configId: config.id,
        provider: config.provider,
        filename: standardFilename,
        targetKey: targetKey,
        status: "CREATING_BACKUP",
        progress: 10,
        stageText: "Initializing Proxmox vzdump snapshot..."
      }
    });

    const vmid = vps.vmid;
    if (!vmid) return NextResponse.json({ error: "VPS is not provisioned with a VM ID" }, { status: 400 });

    // Start background process
    (async () => {
      let createdVolume: string | null = null;

      try {
        // Step 1: Trigger Proxmox vzdump snapshot
        const upid = await proxmox.createBackup(vps.node, vmid, cloudTempStorage);
        if (!upid) {
          throw new Error("Failed to start backup task on Proxmox");
        }

        // Step 2: Poll Proxmox task until finished (max 25 minutes)
        const maxWaitMs = 25 * 60 * 1000;
        const startTime = Date.now();
        let taskCompleted = false;
        let currentProgress = 15;

        while (Date.now() - startTime < maxWaitMs) {
          await sleep(3000);
          const taskStatus = await proxmox.getTaskStatus(vps.node, upid);

          currentProgress = Math.min(50, currentProgress + 4);
          await prisma.vpsCloudBackupRecord.update({
            where: { id: record.id },
            data: {
              progress: currentProgress,
              stageText: `Creating VM snapshot archive (${currentProgress}%)...`
            }
          }).catch(() => {});

          if (taskStatus && taskStatus.status === "stopped") {
            if (taskStatus.exitstatus === "OK") {
              taskCompleted = true;
            } else {
              throw new Error(`Proxmox backup task failed with exit status: ${taskStatus.exitstatus}`);
            }
            break;
          }
        }

        if (!taskCompleted) {
          throw new Error("Proxmox backup task timed out after 25 minutes");
        }

        // Step 3: Find the newly created backup file on Proxmox storage
        const backups = await proxmox.getBackups(vps.node, cloudTempStorage, vmid);
        const sortedBackups = (backups || []).sort((a: any, b: any) => (b.ctime || 0) - (a.ctime || 0));
        const latestBackup = sortedBackups[0];

        if (!latestBackup || !latestBackup.volid) {
          throw new Error("Could not locate the generated backup file on Proxmox storage");
        }

        createdVolume = latestBackup.volid as string;
        const rawFilename = createdVolume.split("/").pop() || standardFilename;
        const realFilename = rawFilename.startsWith("vzdump-") ? rawFilename : standardFilename;

        // Verify accurate file size from Proxmox API or stat on host
        let backupFileSize = BigInt(latestBackup.size || 0);

        try {
          const statResult = await executeProxmoxHostCommand(`stat -c %s "/var/lib/vz/dump/${realFilename}"`, {
            node: vps.node,
            timeoutMs: 10000
          });
          const match = statResult.stdout.match(/(\d+)\s*$/m);
          if (match && parseInt(match[1], 10) > 0) {
            backupFileSize = BigInt(match[1]);
          }
        } catch (statErr) {
          console.warn("Could not stat backup file on host, using latestBackup.size:", statErr);
        }

        const finalTargetKey = `${config.pathPrefix || `vps-${vmid}`}/${realFilename}`;

        // Update record status to UPLOADING_TO_CLOUD with genuine filename and file size
        await prisma.vpsCloudBackupRecord.update({
          where: { id: record.id },
          data: {
            filename: realFilename,
            fileSize: backupFileSize,
            targetKey: finalTargetKey,
            status: "UPLOADING_TO_CLOUD",
            progress: 55,
            stageText: `Streaming backup archive directly from hypervisor to ${config.provider === 'R2' ? 'Cloudflare R2' : 'AWS S3'}...`
          }
        });

        // Step 4: Generate S3 Presigned PUT URL for direct hypervisor upload
        const presignedPutUrl = await getS3PresignedUploadUrl(config, finalTargetKey, 7200);

        // Step 5: Execute curl direct upload from Proxmox host
        // This streams NVMe disk bytes directly to Cloudflare R2 / AWS S3 at gigabit speeds with 0 web server RAM usage
        const uploadCmd = `curl -f -sS -X PUT -T "/var/lib/vz/dump/${realFilename}" "${presignedPutUrl}"`;
        const uploadExec = await executeProxmoxHostCommand(uploadCmd, {
          node: vps.node,
          timeoutMs: 30 * 60 * 1000 // 30 minutes max
        });

        if (uploadExec.exitCode !== 0) {
          throw new Error(`Cloud upload curl failed with code ${uploadExec.exitCode}: ${uploadExec.stdout.slice(-300)}`);
        }

        // Step 6: Generate Presigned GET download URL
        let finalDownloadUrl: string | null = null;
        try {
          finalDownloadUrl = await getS3PresignedDownloadUrl(config, finalTargetKey, 86400); // 24 hours
        } catch (e) {
          finalDownloadUrl = null;
        }

        // Step 7: Mark record as COMPLETED
        await prisma.vpsCloudBackupRecord.update({
          where: { id: record.id },
          data: {
            filename: realFilename,
            targetKey: finalTargetKey,
            downloadUrl: finalDownloadUrl,
            fileSize: backupFileSize,
            status: "COMPLETED",
            progress: 100,
            stageText: "Backup completed and stored in cloud successfully!",
            error: null
          }
        });

        // Update config status
        await prisma.vpsCloudBackupConfig.update({
          where: { id: config.id },
          data: {
            lastBackupAt: new Date(),
            lastStatus: "COMPLETED",
            lastError: null
          }
        });

        // Step 8: Keep hypervisor storage tidy while retaining the latest local copy for fast direct restore
        try {
          const allLocal = await proxmox.getBackups(vps.node, cloudTempStorage, vmid);
          const sorted = (allLocal || []).sort((a: any, b: any) => (b.ctime || 0) - (a.ctime || 0));
          if (sorted.length > 2) {
            for (let i = 2; i < sorted.length; i++) {
              const oldVol = sorted[i].volid;
              if (oldVol && oldVol !== createdVolume) {
                await proxmox.deleteBackup(vps.node, cloudTempStorage, oldVol).catch(() => {});
              }
            }
          }
        } catch {}
      } catch (err: any) {
        console.error("Cloud backup process failed:", err);
        await prisma.vpsCloudBackupRecord.update({
          where: { id: record.id },
          data: {
            status: "FAILED",
            error: err.message || "Backup failed unexpectedly",
            stageText: `Failed: ${err.message || "Unknown error"}`
          }
        }).catch(() => {});

        await prisma.vpsCloudBackupConfig.update({
          where: { id: config.id },
          data: {
            lastStatus: "FAILED",
            lastError: err.message || "Backup failed"
          }
        }).catch(() => {});
      }
    })();

    return NextResponse.json({
      success: true,
      message: "Backup started successfully",
      record
    });
  } catch (error: any) {
    console.error("Run cloud backup error:", error);
    return NextResponse.json({ error: error.message || "Failed to initiate cloud backup" }, { status: 500 });
  }
}
