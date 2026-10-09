import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = 'force-dynamic';
export const fetchCache = 'force-no-store';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const resolvedParams = await params;
    const clusterId = parseInt(resolvedParams.id);
    if (isNaN(clusterId)) return NextResponse.json({ error: "Invalid cluster ID" }, { status: 400 });

    const cluster = await prisma.kubernetesCluster.findFirst({
      where: { id: clusterId, userId: auth.userId },
      select: { id: true, status: true, installLog: true }
    });

    if (!cluster) {
      return NextResponse.json({ error: "Cluster not found" }, { status: 404 });
    }

    let logs: { ts: string; msg: string }[] = [];
    if (cluster.installLog) {
      try {
        logs = JSON.parse(cluster.installLog);
      } catch (e) {
        logs = [];
      }
    }

    return NextResponse.json({
      status: cluster.status,
      logs
    });
  } catch (error) {
    console.error("Fetch K3s install log error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
