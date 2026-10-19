import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userId = auth.userId!;
    const { serviceId, serviceType, autoRenew } = await req.json();

    if (!serviceId || !serviceType || typeof autoRenew !== 'boolean') {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    let updated = null;

    if (serviceType === 'SUBSCRIPTION') {
      const sub = await prisma.subscription.findUnique({ where: { id: serviceId } });
      if (!sub || sub.userId !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      updated = await prisma.subscription.update({ where: { id: serviceId }, data: { autoRenew } });
    } else if (serviceType === 'VPS') {
      const vps = await prisma.vpsService.findUnique({ where: { id: serviceId } });
      if (!vps || vps.userId !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      updated = await prisma.vpsService.update({ where: { id: serviceId }, data: { autoRenew } });
    } else if (serviceType === 'RESERVED_IP') {
      const ip = await prisma.reservedIp.findUnique({ where: { id: serviceId } });
      if (!ip || ip.userId !== userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      updated = await prisma.reservedIp.update({ where: { id: serviceId }, data: { autoRenew } });
    } else {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Auto-renew updated successfully' });
  } catch (error) {
    console.error("Toggle auto renew error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
