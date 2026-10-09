import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    const { name, service, description, price, hourlyPrice, limits, isActive, isPopular } = await req.json();

    if (!name || !service || price === undefined || !limits) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate JSON
    try {
      JSON.parse(limits);
    } catch(e) {
      return NextResponse.json({ error: "Invalid JSON for limits" }, { status: 400 });
    }

    const plan = await prisma.plan.update({
      where: { id },
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

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id);
    if (isNaN(id)) return NextResponse.json({ error: "Invalid ID" }, { status: 400 });

    // Check for subscriptions
    const subCount = await prisma.subscription.count({
      where: { planId: id }
    });

    if (subCount > 0) {
      // Disconnect invoices to avoid foreign key constraints
      await prisma.invoice.updateMany({
        where: { subscription: { planId: id } },
        data: { subscriptionId: null }
      });
      
      // Delete all subscriptions for this plan
      await prisma.subscription.deleteMany({
        where: { planId: id }
      });
    }

    await prisma.plan.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Plan and all associated subscriptions deleted successfully" });
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
