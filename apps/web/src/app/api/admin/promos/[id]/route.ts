import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { deleteLocalFile } from "@/lib/file-utils";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ success: false, error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const promoId = parseInt(id);

    if (isNaN(promoId)) {
      return NextResponse.json({ success: false, error: "Invalid promo ID" }, { status: 400 });
    }

    const { title, description, image, link, isActive, isReward, rewardAmount, maxClaims, validUntil } = await req.json();

    const existingPromo = await prisma.promo.findUnique({ where: { id: promoId } });
    if (!existingPromo) {
      return NextResponse.json({ success: false, error: "Promo not found" }, { status: 404 });
    }

    const updatedPromo = await prisma.promo.update({
      where: { id: promoId },
      data: {
        title: title !== undefined ? title : existingPromo.title,
        description: description !== undefined ? description : existingPromo.description,
        image: image !== undefined ? image : existingPromo.image,
        link: link !== undefined ? link : existingPromo.link,
        isActive: isActive !== undefined ? isActive : existingPromo.isActive,
        isReward: isReward !== undefined ? isReward : existingPromo.isReward,
        rewardAmount: rewardAmount !== undefined ? parseInt(rewardAmount) : existingPromo.rewardAmount,
        maxClaims: maxClaims !== undefined ? parseInt(maxClaims) : existingPromo.maxClaims,
        validUntil: validUntil !== undefined ? (validUntil ? new Date(validUntil) : null) : existingPromo.validUntil,
      }
    });

    return NextResponse.json({ success: true, data: updatedPromo });
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
    const promoId = parseInt(id);

    if (isNaN(promoId)) {
      return NextResponse.json({ success: false, error: "Invalid promo ID" }, { status: 400 });
    }

    const existingPromo = await prisma.promo.findUnique({ where: { id: promoId } });
    if (!existingPromo) {
      return NextResponse.json({ success: false, error: "Promo not found" }, { status: 404 });
    }

    await prisma.promo.delete({ where: { id: promoId } });
    if (existingPromo.image) {
      deleteLocalFile(existingPromo.image);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
