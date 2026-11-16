import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";
import { decryptDeterministic } from "@/lib/encryption";
import {
  authenticateVpsApiKey,
  getOwnedProvisionedVps,
  vpsApiError,
} from "@/lib/vps-api";

export const dynamic = "force-dynamic";

async function getBackupContext(userId: number, rawId: string) {
  const vpsRes = await getOwnedProvisionedVps(userId, rawId);
  if (vpsRes.error) return { error: vpsRes.error };

  const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
  if (!server || !server.backupStorage) {
    return { error: vpsApiError("Backup storage is not configured", 503) };
  }

  const secret = decryptDeterministic(server.tokenSecret) || server.tokenSecret;
  const proxmox = new ProxmoxClient(server.host, server.tokenId, secret);
  return { vps: vpsRes.vps, backupStorage: server.backupStorage, proxmox };
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_BACKUPS_LIST",
      max: 60,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const { id } = await params;
    const ctx = await getBackupContext(auth.apiKey.userId, id);
    if ("error" in ctx) return ctx.error;

    const { vps, backupStorage, proxmox } = ctx;
    const rawList = await proxmox.getBackups(vps.node, backupStorage, vps.vmid!);
    const minCtime = Math.floor(vps.createdAt.getTime() / 1000) - 60;
    const filtered = (rawList || []).filter((b: any) => !b.ctime || b.ctime >= minCtime);

    let usedBytes = 0;
    const backups = filtered
      .map((b: any) => {
        usedBytes += b.size || 0;
        return {
          volume: b.volid,
          size: b.size,
          format: b.format,
          ctime: b.ctime,
          notes: b.notes || "",
        };
      })
      .sort((a: any, b: any) => b.ctime - a.ctime);

    return NextResponse.json({
      success: true,
      data: {
        quotaGb: vps.backupGb,
        usedBytes,
        backups,
      },
    });
  } catch (error) {
    console.error("[VPS_API_BACKUPS_LIST]", error);
    return vpsApiError("Failed to fetch backups", 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_BACKUP_CREATE",
      max: 10,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const { id } = await params;
    const ctx = await getBackupContext(auth.apiKey.userId, id);
    if ("error" in ctx) return ctx.error;

    const { vps, backupStorage, proxmox } = ctx;
    if (vps.backupGb <= 0) {
      return vpsApiError("Backup addon is not enabled for this VPS", 403);
    }

    const rawList = await proxmox.getBackups(vps.node, backupStorage, vps.vmid!);
    const minCtime = Math.floor(vps.createdAt.getTime() / 1000) - 60;
    const filtered = (rawList || []).filter((b: any) => !b.ctime || b.ctime >= minCtime);

    if (filtered.length >= 2) {
      return vpsApiError(
        "Maximum limit of 2 backups reached. Delete an older backup first.",
        403
      );
    }

    const totalBytes = filtered.reduce((acc: number, b: any) => acc + (b.size || 0), 0);
    if (totalBytes >= vps.backupGb * 1024 * 1024 * 1024) {
      return vpsApiError("Backup storage quota exceeded.", 403);
    }

    const task = await proxmox.createBackup(vps.node, vps.vmid!, backupStorage);
    return NextResponse.json(
      {
        success: true,
        data: { vpsId: vps.id, task },
        message: "Backup job initiated",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[VPS_API_BACKUP_CREATE]", error);
    return vpsApiError("Failed to create backup", 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await authenticateVpsApiKey(req, {
      name: "VPS_API_BACKUP_DELETE",
      max: 20,
      windowSec: 60,
    });
    if (auth.error) return auth.error;

    const volume = req.nextUrl.searchParams.get("volume");
    if (!volume) {
      return vpsApiError("Query parameter 'volume' is required", 400);
    }

    const { id } = await params;
    const ctx = await getBackupContext(auth.apiKey.userId, id);
    if ("error" in ctx) return ctx.error;

    const { vps, backupStorage, proxmox } = ctx;
    if (!volume.includes(`-${vps.vmid}-`)) {
      return vpsApiError("Backup volume does not belong to this VPS", 403);
    }

    await proxmox.deleteBackup(vps.node, backupStorage, volume);
    return NextResponse.json({
      success: true,
      message: `Backup '${volume}' deleted`,
    });
  } catch (error) {
    console.error("[VPS_API_BACKUP_DELETE]", error);
    return vpsApiError("Failed to delete backup", 500);
  }
}
