import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { startDatabase, stopDatabase, restartDatabase } from "@/lib/k8s-database";
import { checkRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/get-ip";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const authResult = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (authResult.error) return NextResponse.json({ error: authResult.error }, { status: authResult.status });
    const user = authResult.user!;

    const clientIp = getClientIp(req);
    const rateLimitAllowed = await checkRateLimit("DB_POWER", `${user.id}:${clientIp}`, 10, 30);
    if (!rateLimitAllowed) {
      return NextResponse.json(
        { error: "Too many power actions. Please wait a moment before trying again." },
        { status: 429 }
      );
    }

    const { id: dbIdStr } = await params;
    const dbId = parseInt(dbIdStr, 10);
    if (isNaN(dbId) || dbId <= 0) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const db = await prisma.databaseService.findFirst({
      where: user.role === "ADMIN" ? { id: dbId } : { id: dbId, userId: user.id },
    });

    if (!db || db.status === "TERMINATED") {
      return NextResponse.json({ error: "Database instance not found" }, { status: 404 });
    }

    if (db.status === "SUSPENDED") {
      return NextResponse.json({ error: "Cannot control power on suspended instance. Please top up your balance." }, { status: 403 });
    }

    if (db.status === "PROVISIONING") {
      return NextResponse.json({ error: "Database is currently provisioning or scaling. Please wait." }, { status: 409 });
    }

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action.toLowerCase().trim() : "";

    if (action === "start") {
      const res = await startDatabase(db.id, db.k8sNamespace || "managed-db");
      if (!res.success) return NextResponse.json({ error: res.error || "Failed to start database" }, { status: 500 });
      await prisma.databaseService.update({ where: { id: db.id }, data: { status: "RUNNING" } });
      return NextResponse.json({ success: true, message: "Database started successfully" });
    } else if (action === "stop") {
      const res = await stopDatabase(db.id, db.k8sNamespace || "managed-db");
      if (!res.success) return NextResponse.json({ error: res.error || "Failed to stop database" }, { status: 500 });
      await prisma.databaseService.update({ where: { id: db.id }, data: { status: "STOPPED" } });
      return NextResponse.json({ success: true, message: "Database stopped successfully" });
    } else if (action === "restart") {
      const res = await restartDatabase(db.id, db.k8sNamespace || "managed-db");
      if (!res.success) return NextResponse.json({ error: res.error || "Failed to restart database" }, { status: 500 });
      return NextResponse.json({ success: true, message: "Database restart triggered" });
    } else {
      return NextResponse.json({ error: "Invalid action. Allowed: start, stop, restart" }, { status: 400 });
    }
  } catch (error: any) {
    console.error("Error executing database power action:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

