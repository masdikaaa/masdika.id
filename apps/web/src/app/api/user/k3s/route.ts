import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const clusters = await prisma.kubernetesCluster.findMany({
      where: { userId: auth.userId, status: { not: 'TERMINATED' } },
      orderBy: { createdAt: "desc" },
      include: {
        nodes: {
          include: { assignedIps: true }
        }
      }
    });

    // Strip sensitive info like kubeconfig from the listing
    const sanitized = clusters.map(c => {
      // Calculate total price and determine billing mode from nodes
      let totalPrice = 0;
      let totalAccumulatedCost = 0;
      let finalEndpoint = c.endpoint;

      if (c.nodes && c.nodes.length > 0) {
        totalPrice = c.nodes.reduce((sum, node) => sum + node.hourlyRate, 0);
        totalAccumulatedCost = c.nodes.reduce((sum, node) => sum + node.accumulatedCost, 0);
        
        // Override endpoint if Master has a Public IP
        const masterNode = c.nodes.find(n => n.kubernetesRole === 'MASTER');
        if (masterNode) {
          const masterIpRecord = masterNode.assignedIps?.find(ip => ip.isPrimary) || masterNode.assignedIps?.[0];
          if (masterIpRecord && masterIpRecord.publicIp && finalEndpoint) {
            finalEndpoint = finalEndpoint.replace(masterIpRecord.ipAddress, masterIpRecord.publicIp);
          }
        }
      }

      return {
        id: c.id,
        name: c.name,
        version: c.version,
        endpoint: finalEndpoint,
        status: c.status,
        createdAt: c.createdAt,
        nodeCount: c.nodes.length,
        hourlyRate: totalPrice,
        accumulatedCost: totalAccumulatedCost
      };
    });

    return NextResponse.json(sanitized);
  } catch (error) {
    console.error("Fetch K3s error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
