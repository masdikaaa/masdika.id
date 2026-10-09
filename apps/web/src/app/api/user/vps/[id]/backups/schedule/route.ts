import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    const { schedule } = body;

    if (!["NONE", "DAILY", "WEEKLY", "MONTHLY"].includes(schedule)) {
      return NextResponse.json({ error: "Invalid schedule selected." }, { status: 400 });
    }

    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(id), userId: auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });
    if (!vps.vmid) return NextResponse.json({ error: "VPS is not provisioned" }, { status: 400 });
    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") return NextResponse.json({ error: "VPS is suspended or terminated" }, { status: 403 });
    if (vps.backupGb <= 0) {
      return NextResponse.json({ error: "Backup Addon is not enabled for this VPS" }, { status: 403 });
    }

    await prisma.vpsService.update({
      where: { id: parseInt(id) },
      data: { backupSchedule: schedule }
    });

    return NextResponse.json({ 
      success: true, 
      message: `Automated backup schedule set to ${schedule.toLowerCase()}.` 
    });
  } catch (error: any) {
    console.error("Update backup schedule error:", error);
    return NextResponse.json({ error: error.message || "Failed to update backup schedule" }, { status: 500 });
  }
}
