import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const userId = auth.userId!;

    const subscriptions = await prisma.subscription.findMany({
      where: { userId, status: { not: 'TERMINATED' } },
      include: { plan: true },
      orderBy: { createdAt: "desc" }
    });

    const invoices = await prisma.invoice.findMany({
      where: {
        userId,
        // Exclude legacy hourly billing spam invoices (replaced by PAYG_RUNNING pattern)
        NOT: { reference: 'HOURLY_BILLING' }
      },
      include: {
        subscription: { include: { plan: true } },
        vpsService: { select: { hostname: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const vpsServices = await prisma.vpsService.findMany({
      where: { userId, status: { not: 'TERMINATED' } },
      orderBy: { createdAt: "desc" }
    });

    const reservedIps = await prisma.reservedIp.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { balance: true }
    });

    return NextResponse.json({ success: true, data: { subscriptions, invoices, vpsServices, reservedIps, balance: user?.balance || 0 } });
  } catch (error) {
    console.error("Fetch billing error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
