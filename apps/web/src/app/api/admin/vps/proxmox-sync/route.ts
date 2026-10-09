import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";
import { ProxmoxClient } from "@/lib/proxmox";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const server = await prisma.proxmoxServer.findFirst();
    if (!server) {
      return NextResponse.json({ error: "No Proxmox server configured" }, { status: 404 });
    }

    const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
    
    // First get the node (defaulting to the first one)
    const nodes = await proxmox.getNodes();
    if (!nodes || nodes.length === 0) {
      return NextResponse.json({ error: "No nodes found on Proxmox server" }, { status: 404 });
    }
    
    const targetNode = nodes[0].node;
    let storages = await proxmox.getStorages(targetNode);
    
    // Removed the filter to allow all storages to be returned, matching Proxmox's list.
    // Ensure storages is an array
    if (!Array.isArray(storages)) {
      storages = [];
    }

    return NextResponse.json({ storages });
  } catch (error: any) {
    console.error("Proxmox sync error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch storages" }, { status: 500 });
  }
}
