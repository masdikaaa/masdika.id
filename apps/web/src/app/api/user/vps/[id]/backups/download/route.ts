import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const volume = req.nextUrl.searchParams.get("volume");
    if (!volume) {
      return NextResponse.json({ error: "Volume parameter is required" }, { status: 400 });
    }

    // Security: Validate volume format matches Proxmox backup naming (e.g., "local:backup/vzdump-qemu-100-2024_01_01-00_00_00.vma.zst")
    // This prevents path traversal and accessing arbitrary files on Proxmox storage
    const VOLUME_REGEX = /^[a-zA-Z0-9_-]+:backup\/vzdump-qemu-(\d+)-\d{4}_\d{2}_\d{2}-\d{2}_\d{2}_\d{2}\.(vma|tar)(\.zst|\.gz|\.lzo)?$/;
    const volumeMatch = volume.match(VOLUME_REGEX);
    if (!volumeMatch) {
      return NextResponse.json({ error: "Invalid volume format" }, { status: 400 });
    }

    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(id), userId: auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });

    // Security: Verify the VMID in the backup filename belongs to this user's VPS
    const backupVmid = parseInt(volumeMatch[1]);
    if (vps.vmid && backupVmid !== vps.vmid) {
      return NextResponse.json({ error: "This backup does not belong to your VPS" }, { status: 403 });
    }

    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    if (!server) return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });
    
    const backupStorage = server.backupStorage;
    if (!backupStorage) return NextResponse.json({ error: "Backup storage is not configured." }, { status: 500 });

    const proxmoxUrl = `${server.host.replace(/\/$/, '')}/api2/extjs/nodes/${vps.node}/storage/${backupStorage}/download?volume=${encodeURIComponent(volume)}`;
    
    // We stream the file from Proxmox directly to the client
    const proxmoxRes = await fetch(proxmoxUrl, {
      method: 'GET',
      headers: {
        'Authorization': `PVEAPIToken=${server.tokenId}=${server.tokenSecret}`,
        'Cookie': `PVEAuthCookie=` // Optional, but sometimes extjs endpoints complain if totally missing
      },
      // @ts-ignore
      agent: new (require('https').Agent)({ rejectUnauthorized: false })
    });

    if (!proxmoxRes.ok) {
      const errText = await proxmoxRes.text();
      return NextResponse.json({ error: "Failed to fetch backup from Proxmox: " + errText }, { status: proxmoxRes.status });
    }

    const headers = new Headers();
    headers.set('Content-Disposition', `attachment; filename="${volume.split('/').pop() || volume}"`);
    headers.set('Content-Type', proxmoxRes.headers.get('Content-Type') || 'application/octet-stream');
    if (proxmoxRes.headers.has('Content-Length')) {
      headers.set('Content-Length', proxmoxRes.headers.get('Content-Length')!);
    }

    // Return the readable stream
    return new NextResponse(proxmoxRes.body, {
      status: 200,
      headers
    });
  } catch (error: any) {
    console.error("Download backup error:", error);
    return NextResponse.json({ error: error.message || "Failed to download backup" }, { status: 500 });
  }
}
