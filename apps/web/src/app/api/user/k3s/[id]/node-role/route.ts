import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { decryptDeterministic } from "@/lib/encryption";
import * as k8s from "@kubernetes/client-node";

// Force rebuild 2
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const resolvedParams = await params;
    const clusterId = parseInt(resolvedParams.id);
    if (isNaN(clusterId)) return NextResponse.json({ error: "Invalid cluster ID" }, { status: 400 });

    const body = await req.json();
    const { nodeName, roleName } = body;
    if (!nodeName) return NextResponse.json({ error: "Node name is required" }, { status: 400 });

    const cluster = await prisma.kubernetesCluster.findFirst({
      where: { id: clusterId, userId: auth.userId },
      include: { nodes: true }
    });

    if (!cluster || !cluster.kubeconfig) {
      return NextResponse.json({ error: "Cluster or kubeconfig not found" }, { status: 404 });
    }

    if (cluster.status === "TERMINATED") {
       return NextResponse.json({ error: "Cluster is terminated" }, { status: 403 });
    }

    const targetNode = cluster.nodes?.find(n => n.hostname?.toLowerCase() === nodeName.toLowerCase());
    if (targetNode && (targetNode.status === "SUSPENDED" || targetNode.status === "TERMINATED")) {
       return NextResponse.json({ error: "Cannot modify roles on a suspended or terminated node" }, { status: 403 });
    }

    const decryptedKubeconfig = decryptDeterministic(cluster.kubeconfig);
    const kc = new k8s.KubeConfig();
    kc.loadFromString(decryptedKubeconfig);
    const k8sApi = kc.makeApiClient(k8s.CoreV1Api);

    // Get current node to find existing role labels
    const targetNodeName = nodeName.toLowerCase();
    const nodeRes = await k8sApi.readNode({ name: targetNodeName });
    const nodeLabels = nodeRes.metadata?.labels || {};
    
    const patch: any[] = [];
    
    // Nullify existing roles
    for (const key of Object.keys(nodeLabels)) {
      if (key.startsWith('node-role.kubernetes.io/')) {
        patch.push({ op: "remove", path: `/metadata/labels/${key.replace(/\//g, '~1')}` });
      }
    }
    
    // Set new role if provided
    const newRole = roleName?.trim().toLowerCase();
    if (newRole && newRole !== 'none') {
      patch.push({ op: "add", path: `/metadata/labels/node-role.kubernetes.io~1${newRole}`, value: "true" });
    }
    await k8sApi.patchNode({ name: targetNodeName, body: patch }, { headers: { "Content-Type": "application/json-patch+json" } } as any);
    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error updating node role:", err);
    return NextResponse.json({ error: err?.body?.message || err.message || "Failed to update node role" }, { status: 500 });
  }
}
