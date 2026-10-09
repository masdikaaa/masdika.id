import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

import { decryptDeterministic } from "@/lib/encryption";

export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const clusters = await prisma.kubernetesCluster.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { name: true, email: true }
        },
        nodes: {
          select: { id: true, vmid: true, hostname: true, status: true }
        }
      }
    });

    const decryptedClusters = clusters.map(cluster => ({
      ...cluster,
      user: {
        name: decryptDeterministic(cluster.user.name) || cluster.user.name,
        email: decryptDeterministic(cluster.user.email) || cluster.user.email
      }
    }));

    return NextResponse.json(decryptedClusters);
  } catch (error) {
    console.error("Failed to fetch k3s clusters:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
