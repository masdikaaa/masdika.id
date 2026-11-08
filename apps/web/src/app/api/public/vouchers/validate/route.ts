import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("cf-connecting-ip") ||
      req.headers.get("x-real-ip") ||
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      "unknown";
    const allowed = await checkRateLimit("PUBLIC_VOUCHER_VALIDATE", ip, 10, 300);
    if (!allowed) {
      return NextResponse.json({ success: false, error: "Too many attempts. Please try again later." }, { status: 429 });
    }

    const { code } = await req.json();

    if (!code || typeof code !== "string" || code.trim().length > 64) {
      return NextResponse.json({ success: false, error: "Voucher code is required" }, { status: 400 });
    }

    const voucher = await prisma.voucher.findUnique({
      where: { code: code.trim().toUpperCase() }
    });

    if (
      !voucher ||
      !voucher.isActive ||
      (voucher.validUntil && new Date(voucher.validUntil) < new Date()) ||
      (voucher.maxUses > 0 && voucher.currentUses >= voucher.maxUses)
    ) {
      return NextResponse.json({ success: false, error: "Invalid or expired voucher code" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: {
        code: voucher.code,
        discountPercent: voucher.discountPercent
      }
    });

  } catch {
    return NextResponse.json({ success: false, error: "Failed to validate voucher" }, { status: 500 });
  }
}
