import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { code } = await req.json();

    if (!code) {
      return NextResponse.json({ success: false, error: "Voucher code is required" }, { status: 400 });
    }

    const voucher = await prisma.voucher.findUnique({ 
      where: { code: code.toUpperCase() } 
    });

    if (!voucher || !voucher.isActive) {
      return NextResponse.json({ success: false, error: "Invalid voucher code" }, { status: 404 });
    }

    const usageCount = await prisma.voucherUsage.count({
      where: { userId: auth.userId!, voucherId: voucher.id }
    });

    if (usageCount > 0) {
      return NextResponse.json({ success: false, error: "You have already used this voucher code" }, { status: 400 });
    }

    if (voucher.validUntil && voucher.validUntil < new Date()) {
      return NextResponse.json({ success: false, error: "This voucher has expired" }, { status: 400 });
    }

    if (voucher.maxUses > 0 && voucher.currentUses >= voucher.maxUses) {
      return NextResponse.json({ success: false, error: "This voucher has reached its maximum usage limit" }, { status: 400 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        code: voucher.code,
        description: voucher.description,
        discountPercent: voucher.discountPercent
      } 
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || "An error occurred" }, { status: 500 });
  }
}
