import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const paymentMethods = await prisma.paymentMethod.findMany({
      orderBy: { id: "asc" }
    });

    return NextResponse.json({ success: true, data: paymentMethods });
  } catch (error) {
    console.error("Fetch payment methods error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { paymentMethods } = await req.json();

    if (!Array.isArray(paymentMethods)) {
      return NextResponse.json({ error: "Invalid data format" }, { status: 400 });
    }

    const updates = paymentMethods.map((pm: any) => 
      prisma.paymentMethod.update({
        where: { id: pm.id },
        data: { 
          isActive: pm.isActive,
          fee: pm.fee !== undefined ? Number(pm.fee) : undefined
        }
      })
    );

    await prisma.$transaction(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update payment methods error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get("id") || "", 10);
    if (!id || isNaN(id)) {
      return NextResponse.json({ error: "Valid Payment Method ID is required" }, { status: 400 });
    }

    await prisma.paymentMethod.delete({
      where: { id }
    });

    return NextResponse.json({ success: true, message: "Payment method deleted successfully" });
  } catch (error) {
    console.error("Delete payment method error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
