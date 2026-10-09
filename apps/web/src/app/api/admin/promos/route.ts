import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const promos = await prisma.promo.findMany({
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, data: promos });
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

    const { title, description, image, link, isActive, isReward, rewardAmount, maxClaims, validUntil } = await req.json();

    if (!title || !description) {
      return NextResponse.json({ success: false, error: "Title and description are required" }, { status: 400 });
    }

    const newPromo = await prisma.promo.create({
      data: {
        title,
        description,
        image: image || null,
        link: link || null,
        isActive: isActive !== undefined ? isActive : true,
        isReward: isReward || false,
        rewardAmount: rewardAmount ? parseInt(rewardAmount) : 0,
        maxClaims: maxClaims ? parseInt(maxClaims) : 0,
        validUntil: validUntil ? new Date(validUntil) : null,
      }
    });

    return NextResponse.json({ success: true, data: newPromo });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
