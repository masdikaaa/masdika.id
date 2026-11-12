import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { getDatabaseStatus, deleteDatabase, buildConnectionDetails, getK8sClusterConfig } from "@/lib/k8s-database";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id: dbIdStr } = await params;
    const dbId = parseInt(dbIdStr, 10);
    if (isNaN(dbId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const db = await prisma.databaseService.findFirst({
      where: user.role === "ADMIN" ? { id: dbId } : { id: dbId, userId: user.id },
    });

    if (!db || db.status === "TERMINATED") {
      return NextResponse.json({ error: "Database instance not found" }, { status: 404 });
    }

    // Get live status from Kubernetes
    let liveStatus: any = { status: db.status, ready: db.status === "RUNNING", cpu: "0m", memory: "0Mi" };
    try {
      liveStatus = await getDatabaseStatus(db.id, db.k8sNamespace || "managed-db");
    } catch (e: any) {
      console.warn(`[ManagedDB] Failed to get live status for DB ${db.id}:`, e?.message);
    }

    // Build connection snippets (Laravel, NodeJS, DBeaver, Web Panels, etc.)
    const clusterConfig = await getK8sClusterConfig().catch(() => undefined);
    const connection = buildConnectionDetails(db, clusterConfig);

    return NextResponse.json({
      success: true,
      data: {
        ...db,
        liveStatus,
        k8sStatus: liveStatus,
        connection,
        connectionDetails: connection,
      },
    });
  } catch (error: any) {
    console.error("Error fetching database details:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const { id: dbIdStr } = await params;
    const dbId = parseInt(dbIdStr, 10);
    if (isNaN(dbId)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const db = await prisma.databaseService.findFirst({
      where: user.role === "ADMIN" ? { id: dbId } : { id: dbId, userId: user.id },
    });

    if (!db || db.status === "TERMINATED") {
      return NextResponse.json({ error: "Database instance not found" }, { status: 404 });
    }

    // Clean up Kubernetes resources
    await deleteDatabase(db.id, db.k8sNamespace || "managed-db");

    // Mark as TERMINATED
    await prisma.databaseService.update({
      where: { id: db.id },
      data: {
        status: "TERMINATED",
        terminationDate: new Date(),
      },
    });

    return NextResponse.json({ success: true, message: "Database instance terminated" });
  } catch (error: any) {
    console.error("Error terminating database:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

