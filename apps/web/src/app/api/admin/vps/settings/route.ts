import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const server = await prisma.proxmoxServer.findFirst();

    return NextResponse.json(server || {});
  } catch (error) {
    console.error("Proxmox settings GET error:", error);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { id, name, host, tokenId, tokenSecret, backupStorage, addonDiskStorages, mainDiskStorage, mainDiskStorageSsd, networkBridge, publicNetworkBridge, primaryDns, secondaryDns, isActive } = body;

    let server;
    if (id) {
      server = await prisma.proxmoxServer.update({
        where: { id },
        data: { name, host, tokenId, tokenSecret, backupStorage, addonDiskStorages, mainDiskStorage, mainDiskStorageSsd, networkBridge, publicNetworkBridge, primaryDns, secondaryDns, isActive },
      });
    } else {
      server = await prisma.proxmoxServer.create({
        data: { name, host, tokenId, tokenSecret, backupStorage, addonDiskStorages, mainDiskStorage, mainDiskStorageSsd, networkBridge: networkBridge || "vmbr0", publicNetworkBridge: publicNetworkBridge || "vmbr1", primaryDns, secondaryDns, isActive: isActive ?? true },
      });
    }

    return NextResponse.json(server);
  } catch (error) {
    console.error("Proxmox settings POST error:", error);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
