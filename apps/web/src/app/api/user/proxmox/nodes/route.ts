import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";
import { decryptDeterministic } from "@/lib/encryption";

export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const serverConfig = await prisma.proxmoxServer.findFirst({
      where: { isActive: true }
    });

    if (!serverConfig) {
      return NextResponse.json({ error: "No active Proxmox server configured" }, { status: 500 });
    }

    const proxmox = new ProxmoxClient(
      serverConfig.host,
      serverConfig.tokenId,
      decryptDeterministic(serverConfig.tokenSecret)
    );

    const nodesRes = await proxmox.getNodes();
    
    // Proxmox API returns nodes in an array, e.g., [{ node: 'pve1', status: 'online', cpu: 0.1, maxmem: 123 }]
    // We filter only online nodes to be safe for deployment
    const activeNodes = (nodesRes || [])
      .filter((n: any) => n.status === "online")
      .map((n: any) => ({
        node: n.node,
        regionName: serverConfig.name,
        status: n.status,
        cpu: n.cpu,
        maxcpu: n.maxcpu,
        mem: n.mem,
        maxmem: n.maxmem,
        disk: n.disk,
        maxdisk: n.maxdisk
      }));

    return NextResponse.json({ success: true, nodes: activeNodes });
  } catch (error: any) {
    console.error("Failed to fetch proxmox nodes:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch proxmox nodes" }, { status: 500 });
  }
}
