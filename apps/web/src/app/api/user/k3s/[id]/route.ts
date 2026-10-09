import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const resolvedParams = await params;
    const clusterId = parseInt(resolvedParams.id);
    if (isNaN(clusterId)) return NextResponse.json({ error: "Invalid cluster ID" }, { status: 400 });

    const cluster = await prisma.kubernetesCluster.findFirst({
      where: { 
        id: clusterId,
        userId: auth.userId 
      },
      include: {
        nodes: {
          include: { assignedIps: true }
        }
      }
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    // Attempt to decrypt kubeconfig safely if we need to return it, or just return status
    let decryptedKubeconfig = null;
    if (cluster.kubeconfig) {
        decryptedKubeconfig = decryptDeterministic(cluster.kubeconfig);
    }

    // Strip sensitive passwords from nodes
    const sanitizedNodes = cluster.nodes.map(node => {
        const primaryIpRecord = node.assignedIps?.find(ip => ip.isPrimary) || node.assignedIps?.[0];
        const primaryIp = primaryIpRecord ? (primaryIpRecord.publicIp || primaryIpRecord.ipAddress) : "Provisioning...";

        return {
          id: node.id,
          hostname: node.hostname,
          cpuCores: node.cpuCores,
          ramGb: node.ramGb,
          diskGb: node.diskGb,
          status: node.status,
          liveStatus: null, // Proxmox live status is unused in K3s UI, omitting for performance
          kubernetesRole: node.kubernetesRole,
          ipAddress: primaryIp,
          expiresAt: node.expiresAt
        };
    });

    const pricingItems = await prisma.vpsPricing.findMany();
    const pricing: Record<string, number> = {};
    pricingItems.forEach(item => {
      pricing[item.key] = item.pricePerHour;
    });

    let finalEndpoint = cluster.endpoint;
    
    // Override endpoint and kubeconfig if Master has a Public IP
    const masterNode = cluster.nodes.find(n => n.kubernetesRole === 'MASTER');
    if (masterNode) {
      const masterIpRecord = masterNode.assignedIps?.find(ip => ip.isPrimary) || masterNode.assignedIps?.[0];
      if (masterIpRecord && masterIpRecord.publicIp) {
        if (finalEndpoint) {
          finalEndpoint = finalEndpoint.replace(masterIpRecord.ipAddress, masterIpRecord.publicIp);
        }
        if (decryptedKubeconfig) {
          decryptedKubeconfig = decryptedKubeconfig.replace(masterIpRecord.ipAddress, masterIpRecord.publicIp);
        }
      }
    }

    return NextResponse.json({
      id: cluster.id,
      name: cluster.name,
      version: cluster.version,
      endpoint: finalEndpoint,
      status: cluster.status,
      createdAt: cluster.createdAt,
      kubeconfig: decryptedKubeconfig,
      nodes: sanitizedNodes,
      pricing
    });
  } catch (error) {
    console.error("Fetch K3s detail error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const resolvedParams = await params;
    const clusterId = parseInt(resolvedParams.id);
    if (isNaN(clusterId)) return NextResponse.json({ error: "Invalid cluster ID" }, { status: 400 });

    const { name } = await req.json();
    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: "Valid name is required" }, { status: 400 });
    }

    // Verify ownership
    const cluster = await prisma.kubernetesCluster.findFirst({
      where: { 
        id: clusterId,
        userId: auth.userId 
      }
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    const updated = await prisma.kubernetesCluster.update({
      where: { id: cluster.id },
      data: { name }
    });

    return NextResponse.json({ success: true, name: updated.name });
  } catch (error) {
    console.error("Update K3s cluster error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const resolvedParams = await params;
    const clusterId = parseInt(resolvedParams.id);
    if (isNaN(clusterId)) return NextResponse.json({ error: "Invalid cluster ID" }, { status: 400 });

    const cluster = await prisma.kubernetesCluster.findFirst({
      where: { 
        id: clusterId,
        userId: auth.userId 
      },
      include: {
        nodes: {
          include: { assignedIps: true }
        }
      }
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    if (cluster.status === "TERMINATED") {
      return NextResponse.json({ error: "Cluster is already terminated" }, { status: 400 });
    }

    if (cluster.nodes.some(node => node.vpcId || node.vpcIp)) {
      return NextResponse.json({ error: "Cannot delete Kubernetes Cluster while one or more nodes are attached to a VPC. Please detach the private IP(s) first." }, { status: 400 });
    }

    // SECURITY: Unconditional Atomic Lock to prevent double-termination race conditions
    const lockResult = await prisma.kubernetesCluster.updateMany({
      where: { id: cluster.id, status: { notIn: ['TERMINATED', 'TERMINATING'] } },
      data: { status: 'TERMINATING' }
    });
    
    if (lockResult.count === 0) {
      return NextResponse.json({ error: "Cluster is already being terminated by another process." }, { status: 409 });
    }

    const { ProxmoxClient } = await import("@/lib/proxmox");
    const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
    const proxmox = server ? new ProxmoxClient(server.host, server.tokenId, server.tokenSecret) : null;

    for (const node of cluster.nodes) {
      if (node.status === "TERMINATED") continue;

      // 1. Finalize PAYG Billing — balance was already deducted every hour by cron
      {
        const runningInvoice = await prisma.invoice.findFirst({
          where: { vpsServiceId: node.id, reference: 'PAYG_RUNNING', type: 'VPS' },
          orderBy: { createdAt: 'desc' }
        });
        if (runningInvoice) {
          await prisma.invoice.update({
            where: { id: runningInvoice.id },
            data: { reference: 'PAYG_COMPLETED' }
          });
        }
      }

      // 2. Free IP Addresses
      for (const ip of node.assignedIps) {
        await prisma.vpsIpAssignment.delete({ where: { id: ip.id } });
      }

      // 2.5 Detach reserved IPs so they remain owned and billed to the user
      await prisma.reservedIp.updateMany({
        where: { vpsId: node.id },
        data: { isAttached: false, vpsId: null }
      });

      // 3. Delete VM in Proxmox
      if (node.vmid && proxmox) {
        try {
          try {
            await proxmox.stopVm(node.node, node.vmid);
            await new Promise(r => setTimeout(r, 2000));
          } catch(e) {}
          await proxmox.deleteVm(node.node, node.vmid);
        } catch (e) {
          console.error(`Failed to delete node ${node.vmid} in Proxmox`, e);
        }
      }

      // 4. Mark node as TERMINATED
      await prisma.vpsService.update({
        where: { id: node.id },
        data: { status: "TERMINATED", vmid: null }
      });
    }

    // 5. Mark Cluster as TERMINATED
    await prisma.kubernetesCluster.update({
      where: { id: cluster.id },
      data: { status: "TERMINATED" }
    });

    return NextResponse.json({ success: true, message: "Cluster terminated successfully" });
  } catch (error) {
    console.error("DELETE K3s cluster error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
