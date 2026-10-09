import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ProxmoxClient } from "@/lib/proxmox";

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const resolvedParams = await params;
    const clusterId = parseInt(resolvedParams.id);
    if (isNaN(clusterId)) {
      return NextResponse.json({ error: "Invalid ID" }, { status: 400 });
    }

    // Find the cluster and its associated nodes
    const cluster = await prisma.kubernetesCluster.findUnique({
      where: { id: clusterId },
      include: {
        nodes: true
      }
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    // Terminate all associated VPS nodes from Proxmox and DB
    if (cluster.nodes && cluster.nodes.length > 0) {
      const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
      if (server) {
        const proxmox = new ProxmoxClient(server.host, server.tokenId, server.tokenSecret);
        for (const node of cluster.nodes) {
          if (node.vmid) {
            try {
              // Stop VM first
              await proxmox.stopVm(node.node, node.vmid);
              await new Promise(resolve => setTimeout(resolve, 3000));
              // Destroy VM
              await proxmox.deleteVm(node.node, node.vmid);
            } catch (e) {
              console.log(`Failed to terminate VM ${node.vmid} for K3s node ${node.id}:`, e);
            }
          }
          // Release IPs and delete VPS record
          await prisma.vpsIpAssignment.deleteMany({ where: { vpsId: node.id } });
          await prisma.vpsService.delete({ where: { id: node.id } });
        }
      }
    }

    // Finally delete the cluster
    await prisma.kubernetesCluster.delete({
      where: { id: clusterId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete k3s cluster:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
