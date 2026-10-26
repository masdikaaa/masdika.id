import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { Readable } from "stream";
import {
  uploadStreamToS3,
  getS3PresignedDownloadUrl,
  streamUploadToGoogleDrive,
  deleteFromS3,
  deleteFromGoogleDrive
} from "@/lib/cloud-storage";

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

    // Validate provider credentials
    if (config.provider === "R2" || config.provider === "S3") {
      if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
        return NextResponse.json(
          { error: `Missing credentials for ${config.provider === "R2" ? "Cloudflare R2" : "AWS S3"}. Please check your settings.` },
          { status: 400 }
        );
      }
    } else if (config.provider === "GDRIVE") {
      if (!config.gdriveClientEmail || !config.gdrivePrivateKey) {
        return NextResponse.json(
          { error: "Missing Google Drive Service Account Email or Private Key. Please check your settings." },
          { status: 400 }
        );
      }
    }

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

    const backupStorage = server.backupStorage || "local";
    const timestampStr = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const targetKey = `${config.pathPrefix || `vps-${vps.vmid}`}/vzdump-qemu-${vps.vmid}-${timestampStr}.vma.zst`;
    const tempFilename = `vzdump-qemu-${vps.vmid}-${timestampStr}.vma.zst`;

    // Create tracking record
    const record = await prisma.vpsCloudBackupRecord.create({
      data: {
        vpsId: vps.id,
        configId: config.id,
        provider: config.provider,
        filename: tempFilename,
        targetKey: targetKey,
        status: "CREATING_BACKUP"
      }
    });

    const vmid = vps.vmid;
    if (!vmid) return NextResponse.json({ error: "VPS is not provisioned with a VM ID" }, { status: 400 });

    // Start background process
    (async () => {
      const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
      let createdVolume: string | null = null;

      try {
        // Step 1: Trigger Proxmox vzdump
        const upid = await proxmox.createBackup(vps.node, vmid, backupStorage);
        if (!upid) {
          throw new Error("Failed to start backup task on Proxmox");
        }

        // Step 2: Poll Proxmox task until finished (max 20 minutes)
        const maxWaitMs = 20 * 60 * 1000;
        const startTime = Date.now();
        let taskCompleted = false;

        while (Date.now() - startTime < maxWaitMs) {
          await sleep(4000);
          const taskStatus = await proxmox.getTaskStatus(vps.node, upid);

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
          throw new Error("Proxmox backup task timed out after 20 minutes");
        }

        // Step 3: Find the newly created backup file
        const backups = await proxmox.getBackups(vps.node, backupStorage, vmid);
        const sortedBackups = (backups || []).sort((a: any, b: any) => (b.ctime || 0) - (a.ctime || 0));
        const latestBackup = sortedBackups[0];

        if (!latestBackup || !latestBackup.volid) {
          throw new Error("Could not locate the generated backup file on Proxmox storage");
        }

        createdVolume = latestBackup.volid as string;
        const realFilename = createdVolume.split("/").pop() || tempFilename;
        const backupFileSize = BigInt(latestBackup.size || 0);

        // Update record status to UPLOADING_TO_CLOUD
        await prisma.vpsCloudBackupRecord.update({
          where: { id: record.id },
          data: {
            filename: realFilename,
            fileSize: backupFileSize,
            status: "UPLOADING_TO_CLOUD"
          }
        });

        // Step 4: Stream download from Proxmox
        const proxmoxDownloadUrl = `${server.host.replace(/\/$/, "")}/api2/extjs/nodes/${vps.node}/storage/${backupStorage}/download?volume=${encodeURIComponent(createdVolume)}`;

        const proxmoxRes = await fetch(proxmoxDownloadUrl, {
          method: "GET",
          headers: {
            Authorization: `PVEAPIToken=${server.tokenId}=${server.tokenSecret}`,
            Cookie: "PVEAuthCookie="
          }
        });

        if (!proxmoxRes.ok) {
          const errText = await proxmoxRes.text();
          throw new Error(`Failed to download backup stream from Proxmox (${proxmoxRes.status}): ${errText}`);
        }

        if (!proxmoxRes.body) {
          throw new Error("Proxmox response body stream is empty");
        }

        // Memory safe: Convert Web ReadableStream to Node.js Readable stream
        // Pipes chunks directly to destination without holding the entire file in RAM
        const proxmoxStream = Readable.fromWeb(proxmoxRes.body as any);

        let finalDownloadUrl: string | null = null;
        let finalTargetKey = `${config.pathPrefix || `vps-${vmid}`}/${realFilename}`;

        // Step 5: Upload to target provider via memory-safe streams
        if (config.provider === "R2" || config.provider === "S3") {
          await uploadStreamToS3(config, {
            key: finalTargetKey,
            body: proxmoxStream,
            contentType: "application/octet-stream"
          });

          // Generate initial presigned URL
          try {
            finalDownloadUrl = await getS3PresignedDownloadUrl(config, finalTargetKey, 86400); // 24 hours
          } catch (e) {
            finalDownloadUrl = null;
          }
        } else if (config.provider === "GDRIVE") {
          const driveResult = await streamUploadToGoogleDrive(config, {
            filename: realFilename,
            stream: proxmoxStream,
            contentLength: Number(backupFileSize),
            mimeType: "application/octet-stream"
          });
          finalTargetKey = driveResult.fileId;
          finalDownloadUrl = driveResult.webViewLink || `https://drive.google.com/file/d/${driveResult.fileId}/view`;
        }

        // Step 6: Mark record as COMPLETED
        await prisma.vpsCloudBackupRecord.update({
          where: { id: record.id },
          data: {
            filename: realFilename,
            targetKey: finalTargetKey,
            downloadUrl: finalDownloadUrl,
            fileSize: backupFileSize,
            status: "COMPLETED",
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

        // Step 7: Clean up temporary backup from Proxmox storage if user does NOT have paid backup quota
        if (vps.backupGb <= 0 && createdVolume) {
          try {
            await proxmox.deleteBackup(vps.node, backupStorage, createdVolume);
          } catch (delErr) {
            console.warn("Failed to delete temp local backup from Proxmox:", delErr);
          }
        }
      } catch (err: any) {
        console.error("Cloud backup execution error:", err);
        const errMsg = err?.message || String(err);

        await prisma.vpsCloudBackupRecord.update({
          where: { id: record.id },
          data: {
            status: "FAILED",
            error: errMsg
          }
        });

        await prisma.vpsCloudBackupConfig.update({
          where: { id: config.id },
          data: {
            lastStatus: "ERROR",
            lastError: errMsg
          }
        });

        // Clean up temp backup if failed
        if (vps.backupGb <= 0 && createdVolume) {
          try {
            await proxmox.deleteBackup(vps.node, backupStorage, createdVolume);
          } catch {}
        }
      }
    })();

    return NextResponse.json({
      success: true,
      message: "Cloud backup started successfully",
      record: {
        ...record,
        fileSize: Number(record.fileSize)
      }
    });
  } catch (error: any) {
    console.error("Run cloud backup error:", error);
    return NextResponse.json({ error: error.message || "Failed to start backup" }, { status: 500 });
  }
}
