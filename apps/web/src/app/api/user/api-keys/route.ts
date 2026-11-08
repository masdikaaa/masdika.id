import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const apiKeys = await prisma.apiKey.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ 
      success: true, 
      apiKeys,
      balance: user.balance,
      isReseller: user.isReseller
    });
  } catch (error) {
    console.error("API Keys GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.impersonatedBy) {
      return NextResponse.json({ error: "API Key generation is disabled during impersonation" }, { status: 403 });
    }
    const user = auth.user!;

    const body = await req.json();
    const { name, service = "RESELLER" } = body;

    if (service !== "RESELLER") {
      return NextResponse.json({ error: "Unsupported API key service type" }, { status: 400 });
    }

    const safeName = typeof name === "string" && name.trim().length > 0
      ? name.trim().slice(0, 64)
      : "Reseller API Key";

    // Validate Reseller Balance Requirement (Min Rp 66,430 - Cost of basic VPS with public IP)
    if (user.balance < 66430) {
      return NextResponse.json({ 
        error: "Insufficient balance to generate Reseller API Key. Minimum balance required is Rp 66.430." 
      }, { status: 400 });
    }

    const key = `masdika_${crypto.randomBytes(24).toString('hex')}`;

    const newKey = await prisma.$transaction(async (tx) => {
      const existingResellerKey = await tx.apiKey.findFirst({
        where: { userId: user.id, service: "RESELLER" }
      });
      if (existingResellerKey) {
        throw new Error("KEY_LIMIT_REACHED");
      }

      return tx.apiKey.create({
        data: {
          name: safeName,
          key,
          userId: user.id,
          service: "RESELLER"
        }
      });
    });

    return NextResponse.json({ success: true, apiKey: newKey });
  } catch (error: any) {
    if (error?.message === "KEY_LIMIT_REACHED") {
      return NextResponse.json({ 
        error: "You can only have one active Reseller API key. Please revoke your existing key before generating a new one." 
      }, { status: 400 });
    }
    console.error("API Keys POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.impersonatedBy) {
      return NextResponse.json({ error: "API Key deletion is disabled during impersonation" }, { status: 403 });
    }
    const user = auth.user!;

    const { id } = await req.json();
    const keyId = Number(id);
    if (!Number.isSafeInteger(keyId) || keyId <= 0) {
      return NextResponse.json({ error: "Valid Key ID required" }, { status: 400 });
    }

    await prisma.apiKey.deleteMany({
      where: {
        id: keyId,
        userId: user.id
      }
    });

    return NextResponse.json({ success: true, message: "API Key deleted successfully" });
  } catch (error) {
    console.error("API Keys DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
