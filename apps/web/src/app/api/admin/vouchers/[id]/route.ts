import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const voucherId = parseInt(id);
    if (isNaN(voucherId)) {
      return NextResponse.json({ success: false, error: "Invalid voucher ID" }, { status: 400 });
    }
    const data = await req.json();

    const updatedData: any = {};
    if (data.isActive !== undefined) updatedData.isActive = data.isActive;
    if (data.code !== undefined) updatedData.code = String(data.code).toUpperCase().trim();
    if (data.description !== undefined) updatedData.description = data.description;
    if (data.discountPercent !== undefined) {
      const disc = parseInt(data.discountPercent);
      if (isNaN(disc) || disc < 1 || disc > 100) {
        return NextResponse.json({ success: false, error: "Discount must be between 1 and 100" }, { status: 400 });
      }
      updatedData.discountPercent = disc;
    }
    if (data.maxUses !== undefined) updatedData.maxUses = Math.max(0, parseInt(data.maxUses) || 0);
    if (data.validUntil !== undefined) updatedData.validUntil = data.validUntil ? new Date(data.validUntil) : null;

    const updated = await prisma.voucher.update({
      where: { id: voucherId },
      data: updatedData
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const voucherId = parseInt(id);
    if (isNaN(voucherId)) {
      return NextResponse.json({ success: false, error: "Invalid voucher ID" }, { status: 400 });
    }

    await prisma.voucher.delete({
      where: { id: voucherId }
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
