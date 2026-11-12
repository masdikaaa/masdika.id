import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { exportDatabaseDump } from "@/lib/k8s-database";

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

    if (db.status !== "RUNNING") {
      return NextResponse.json({ error: "Database must be running to perform an export" }, { status: 400 });
    }

    const dumpResult = await exportDatabaseDump({
      id: db.id,
      userId: db.userId,
      name: db.name,
      type: db.type,
      version: db.version,
      planName: db.planName,
      region: db.region,
      node: db.node,
      host: db.host,
      port: db.port,
      dbName: db.dbName,
      username: db.username,
      password: db.password,
      rootPassword: db.rootPassword,
      cpuShares: db.cpuShares,
      memoryMb: db.memoryMb,
      storageGb: db.storageGb,
      status: db.status,
      k8sNamespace: db.k8sNamespace,
    });

    if (!dumpResult.success || !dumpResult.data) {
      return NextResponse.json({ error: dumpResult.error || "Failed to generate database dump" }, { status: 500 });
    }

    const filename = dumpResult.filename || `${db.name}-backup.sql`;

    return new NextResponse(dumpResult.data, {
      status: 200,
      headers: {
        "Content-Type": "application/sql",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (error: any) {
    console.error("Error exporting database:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

