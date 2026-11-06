import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";
import { JobQueueService } from "@/lib/job-queue";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const userId = auth.userId!;
    const user = auth.user!;

    const { id } = await params;
    const whereClause: any = { id: parseInt(id) };
    if (user?.role !== "ADMIN") {
        whereClause.userId = userId;
    }

    const vps = await prisma.vpsService.findFirst({
      where: whereClause
    });

    if (!vps || !vps.vmid) {
      return NextResponse.json({ error: "VPS not found or not provisioned" }, { status: 404 });
    }

    if (vps.status === "SUSPENDED" || vps.status === "TERMINATED") {
      return NextResponse.json({ error: "VPS is suspended or terminated. Reinstallation is blocked." }, { status: 403 });
    }

    if (vps.status === "PROVISIONING") {
      return NextResponse.json({ error: "VPS is already being provisioned or reinstalled." }, { status: 409 });
    }

    const body = await req.json();
    const { templateName, password } = body;

    if (!templateName) {
        return NextResponse.json({ error: "Template name is required" }, { status: 400 });
    }

    // Verify template exists
    const template = await prisma.vpsTemplate.findFirst({ where: { name: templateName } });
    if (!template) {
        return NextResponse.json({ error: "Invalid template selected" }, { status: 400 });
    }

    // Atomic lock so concurrent reinstall calls cannot collide
    const lock = await prisma.vpsService.updateMany({
      where: { id: vps.id, status: vps.status },
      data: { status: "PROVISIONING" },
    });
    if (lock.count === 0) {
      return NextResponse.json({ error: "Instance state changed. Please retry." }, { status: 409 });
    }

    // Enqueue reinstall task into background worker queue for resilient, zero-downtime execution
    await JobQueueService.enqueue('REINSTALL_VPS', {
      vpsId: vps.id,
      templateName,
      password,
    });

    return NextResponse.json({ message: "Reinstallation started. The server will be rebuilt shortly." });
  } catch (error: any) {
    console.error("VPS Reinstall Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
