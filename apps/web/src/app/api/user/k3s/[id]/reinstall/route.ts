import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { JobQueueService } from "@/lib/job-queue";
import { checkRateLimit } from "@/lib/rate-limit";

const K3S_VERSION_REGEX = /^(v1\.\d{1,2}(?:\.\d{1,2}(?:\+k3s\d+)?)?|stable|latest)$/;

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const allowed = await checkRateLimit("K3S_REINSTALL", String(auth.userId), 5, 900);
    if (!allowed) {
      return NextResponse.json({ error: "Too many cluster reinstall requests. Please wait 15 minutes." }, { status: 429 });
    }

    let body: any;
    try {
      body = await req.json();
    } catch (e) {
      body = {};
    }
    const rawVersion = body?.version ? String(body.version).trim() : "v1.31";
    if (!K3S_VERSION_REGEX.test(rawVersion)) {
      return NextResponse.json({ error: "Invalid Kubernetes version channel format." }, { status: 400 });
    }
    const version = rawVersion;

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

    if (cluster.status === "TERMINATED" || cluster.status === "INSTALLING_K3S" || cluster.status === "PROVISIONING") {
      return NextResponse.json({ error: `Cannot reinstall cluster while status is ${cluster.status}.` }, { status: 400 });
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

    await JobQueueService.enqueue('REINSTALL_K3S', { 
      clusterId: cluster.id,
      version: version,
      ipAddress: ipAddress, // master IP
      masterVpcIp: masterNode.vpcIp,
      masterNodeId: masterNode.id,
      masterUsername: masterNode.username,
      masterRootPassword: masterNode.rootPassword
    });

    return NextResponse.json({ success: true, message: "Cluster reinstallation queued" });
  } catch (error) {
    console.error("Reinstall K3s error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
