import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { ensureDatabasePlansExist } from "@/lib/database-plans-server";
import { ensureAppPlansExist } from "@/lib/app-plans-server";

export const VALID_SERVICES = [
  'DATABASE',
  'APP',
  'CDN',
  'TIKTOK',
  'SPOTIFY',
  'YOUTUBE',
  'BLOG',
  'BMKG_WEATHER',
  'BMKG_EARTHQUAKE',
] as const;

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    // Ensure all 6 managed database plans & managed app plans exist
    await ensureDatabasePlansExist();
    await ensureAppPlansExist();

    // Auto-purge any lingering obsolete plans outside the official active services
    prisma.plan.deleteMany({
      where: { service: { notIn: VALID_SERVICES as unknown as string[] } }
    }).catch(console.error);

    const plans = await prisma.plan.findMany({
      where: {
        service: { in: VALID_SERVICES as unknown as string[] }
      },
      orderBy: [
        { service: 'asc' },
        { price: 'asc' }
      ]
    });

    return NextResponse.json({ success: true, data: plans });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { name, service, description, price, hourlyPrice, limits, isActive, isPopular } = await req.json();

    if (!name || !service || price === undefined || !limits) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    if (!VALID_SERVICES.includes(service as any)) {
      return NextResponse.json({ error: `Invalid service. Allowed: ${VALID_SERVICES.join(', ')}` }, { status: 400 });
    }

    // Validate JSON
    try {
      JSON.parse(limits);
    } catch(e) {
      return NextResponse.json({ error: "Invalid JSON for limits" }, { status: 400 });
    }

    const plan = await prisma.plan.create({
      data: {
        name,
        service,
        description,
        price: Number(price),
        hourlyPrice: Number(hourlyPrice || 0),
        limits,
        isActive: Boolean(isActive),
        isPopular: Boolean(isPopular)
      }
    });

    return NextResponse.json({ success: true, data: plan });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await req.json();
    if (body.ids && Array.isArray(body.ids)) {
      // First, forcefully delete all subscriptions associated with these plans
      await prisma.subscription.deleteMany({
        where: { planId: { in: body.ids } }
      });

      // Then delete the plans themselves
      await prisma.plan.deleteMany({
        where: { id: { in: body.ids } }
      });
      return NextResponse.json({ success: true });
    }
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  } catch (error) {
    console.error("Bulk delete plans error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
