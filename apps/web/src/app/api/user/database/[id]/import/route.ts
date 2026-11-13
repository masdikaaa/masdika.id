import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { importDatabaseDump } from "@/lib/k8s-database";

export const maxDuration = 300; // Allow up to 5 minutes for large SQL imports

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
      return NextResponse.json({ error: "Database must be running to perform an import" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No database dump file provided" }, { status: 400 });
    }

    // Limit to 50MB per upload
    if (file.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: "File exceeds the 50MB size limit" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const typeUpper = db.type.toUpperCase();
    const validExtensions =
      typeUpper === "REDIS"
        ? [".rdb"]
        : typeUpper === "MONGODB" || typeUpper === "MONGO"
          ? [".archive", ".gz", ".json", ".dump", ".bson"]
          : [".sql", ".dump", ".txt"];
    if (!validExtensions.some((ext) => fileName.endsWith(ext))) {
      return NextResponse.json(
        { error: `Invalid file format. Supported for ${db.type}: ${validExtensions.join(", ")}` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await importDatabaseDump(
      {
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
      },
      buffer,
      file.name
    );

    if (!result.success) {
      return NextResponse.json({ error: result.error || "Failed to import database file" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: result.message || "Database dump imported successfully",
      importedBytes: file.size,
      fileName: file.name,
    });
  } catch (error: any) {
    console.error("Error importing database dump:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

