import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const vouchers = await prisma.voucher.findMany({
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: vouchers });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { code, description, discountPercent, maxUses, validUntil } = await req.json();

    if (!code || !discountPercent) {
      return NextResponse.json({ success: false, error: "Code and discount percent are required" }, { status: 400 });
    }

    const disc = parseInt(discountPercent);
    if (isNaN(disc) || disc < 1 || disc > 100) {
      return NextResponse.json({ success: false, error: "Discount must be between 1 and 100" }, { status: 400 });
    }

    const exists = await prisma.voucher.findUnique({ where: { code: code.toUpperCase() } });
    if (exists) {
      return NextResponse.json({ success: false, error: "Voucher code already exists" }, { status: 400 });
    }

    const newVoucher = await prisma.voucher.create({
      data: {
        code: code.toUpperCase(),
        description: description || null,
        discountPercent: disc,
        maxUses: maxUses ? parseInt(maxUses) : 0,
        validUntil: validUntil ? new Date(validUntil) : null
      }
    });

    return NextResponse.json({ success: true, data: newVoucher });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
