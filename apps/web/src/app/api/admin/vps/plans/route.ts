import { NextResponse } from "next/server";
import { requireAuth } from '@/lib/auth-middleware';
import { prisma } from "@/lib/prisma";

const DEFAULT_PLANS = [
  { name: "Starter", cpuCores: 1, ramGb: 1, diskGb: 20, diskType: "HDD", monthlyPrice: 50000, isActive: true },
  { name: "Standard", cpuCores: 2, ramGb: 4, diskGb: 50, diskType: "HDD", monthlyPrice: 150000, isActive: true },
  { name: "Pro", cpuCores: 4, ramGb: 8, diskGb: 100, diskType: "HDD", monthlyPrice: 300000, isActive: true },
];

export async function GET(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    let plans = await prisma.vpsPlan.findMany({
      orderBy: { order: "asc" },
    });

    // Auto-seed if empty
    if (plans.length === 0) {
      await prisma.vpsPlan.createMany({ data: DEFAULT_PLANS.map((p, i) => ({ ...p, order: i })) });
      plans = await prisma.vpsPlan.findMany({ orderBy: { order: "asc" } });
    }

    return NextResponse.json(plans);
  } catch (error) {
    console.error("GET VPS plans error:", error);
    return NextResponse.json({ error: "Failed to fetch plans" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const { id, name, cpuCores, ramGb, diskGb, diskType, monthlyPrice, quarterlyPrice, semiAnnuallyPrice, annuallyPrice, isReseller, isActive } = await req.json();

    if (id) {
      // Update
      const plan = await prisma.vpsPlan.update({
        where: { id },
        data: { name, cpuCores: Number(cpuCores), ramGb: Number(ramGb), diskGb: Number(diskGb), diskType: diskType || "HDD", monthlyPrice: Number(monthlyPrice), quarterlyPrice: Number(quarterlyPrice || 0), semiAnnuallyPrice: Number(semiAnnuallyPrice || 0), annuallyPrice: Number(annuallyPrice || 0), isReseller: Boolean(isReseller), isActive }
      });
      return NextResponse.json({ success: true, plan });
    } else {
      // Create
      // Get max order
      const maxOrderPlan = await prisma.vpsPlan.findFirst({
        orderBy: { order: 'desc' }
      });
      const newOrder = maxOrderPlan ? maxOrderPlan.order + 1 : 0;

      const plan = await prisma.vpsPlan.create({
        data: { name, cpuCores: Number(cpuCores), ramGb: Number(ramGb), diskGb: Number(diskGb), diskType: diskType || "HDD", monthlyPrice: Number(monthlyPrice), quarterlyPrice: Number(quarterlyPrice || 0), semiAnnuallyPrice: Number(semiAnnuallyPrice || 0), annuallyPrice: Number(annuallyPrice || 0), isReseller: Boolean(isReseller), isActive, order: newOrder }
      });
      return NextResponse.json({ success: true, plan });
    }
  } catch (error) {
    console.error("POST VPS plan error:", error);
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "ID required" }, { status: 400 });

    await prisma.vpsPlan.delete({ where: { id: Number(id) } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE VPS plan error:", error);
    return NextResponse.json({ error: "Failed to delete plan" }, { status: 500 });
  }
}
