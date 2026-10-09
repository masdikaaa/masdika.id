import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic, encryptDeterministic } from "@/lib/encryption";
import { NodeSSH } from "node-ssh";
import { K3sProvisioningService } from "@/lib/k3s-provisioning";
import fs from "fs";
import path from "path";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    let body;
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }
    const version = body.version || "v1.31";

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

    const masterNode = cluster.nodes.find(n => n.kubernetesRole === "MASTER" || !n.kubernetesRole);
    if (!masterNode) {
      return NextResponse.json({ error: "Master node not found" }, { status: 404 });
    }
    
    if (masterNode.status === "SUSPENDED" || masterNode.status === "TERMINATED") {
      return NextResponse.json({ error: "Cannot reinstall cluster because the master node is suspended or terminated." }, { status: 403 });
    }

    const publicIp = masterNode.assignedIps?.find(ip => ip.isPrimary)?.ipAddress || masterNode.assignedIps?.[0]?.ipAddress;
    if (!publicIp) {
      return NextResponse.json({ error: "Master node has no Public IP address assigned. K3s operations require a Public IP." }, { status: 400 });
    }
    const ipAddress = publicIp;

    // Reset the cluster status and clear installLog before reinstalling
    await prisma.kubernetesCluster.update({
      where: { id: cluster.id },
      data: { 
        status: "INSTALLING_K3S",
        installLog: "[]"
      }
    });
    
    // Also mark all nodes as installing
    await prisma.vpsService.updateMany({
      where: { kubernetesClusterId: cluster.id },
      data: { status: "INSTALLING_K3S" }
    });

    import('@/lib/job-queue').then(({ JobQueueService }) => {
      JobQueueService.enqueue('REINSTALL_K3S', { 
        clusterId: cluster.id,
        version: version,
        ipAddress: ipAddress, // master IP
        masterVpcIp: masterNode.vpcIp,
        masterNodeId: masterNode.id,
        masterUsername: masterNode.username,
        masterRootPassword: masterNode.rootPassword
      })
      .catch((err) => console.error(`Failed to enqueue REINSTALL_K3S job for cluster ID ${cluster.id}:`, err));
    });

    return NextResponse.json({ success: true, message: "Cluster reinstallation queued" });
  } catch (error) {
    console.error("Reinstall K3s error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
