import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { action, id, type, status, expiresAt, terminationDate } = await req.json();

    if (action !== "update") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const updateData: any = {};
    if (status !== undefined) updateData.status = status;
    if (expiresAt !== undefined) updateData.expiresAt = expiresAt ? new Date(expiresAt) : null;
    if (terminationDate !== undefined) updateData.terminationDate = terminationDate ? new Date(terminationDate) : null;

    if (type === 'subscriptions') {
      await prisma.subscription.update({
        where: { id: Number(id) },
        data: updateData
      });
    } else if (type === 'custom-services') {
      await prisma.customService.update({
        where: { id: Number(id) },
        data: updateData
      });
    } else if (type === 'kubernetes') {
      await prisma.kubernetesCluster.update({
        where: { id: Number(id) },
        data: updateData
      });
    } else {
       return NextResponse.json({ error: "Unknown service type" }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: "Service updated successfully" });
  } catch (error: any) {
    console.error(`Admin service action error:`, error);
    return NextResponse.json({ error: error.message || "Action failed" }, { status: 500 });
  }
}
