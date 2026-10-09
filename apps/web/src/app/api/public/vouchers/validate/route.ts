import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code || typeof code !== "string") {
      return NextResponse.json({ success: false, error: "Voucher code is required" }, { status: 400 });
    }

    const voucher = await prisma.voucher.findUnique({
      where: { code: code.toUpperCase() }
    });

    if (!voucher) {
      return NextResponse.json({ success: false, error: "Invalid voucher code" }, { status: 404 });
    }

    if (!voucher.isActive) {
      return NextResponse.json({ success: false, error: "Voucher code is inactive" }, { status: 400 });
    }

    if (voucher.validUntil && new Date(voucher.validUntil) < new Date()) {
      return NextResponse.json({ success: false, error: "Voucher code has expired" }, { status: 400 });
    }

    if (voucher.maxUses > 0 && voucher.currentUses >= voucher.maxUses) {
      return NextResponse.json({ success: false, error: "Voucher usage limit reached" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        code: voucher.code,
        discountPercent: voucher.discountPercent
      }
    });

  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
