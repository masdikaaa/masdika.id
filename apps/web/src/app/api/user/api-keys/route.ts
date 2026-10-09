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
    const user = auth.user!;

    const { name, service = "RESELLER" } = await req.json();

    // Validate Reseller Balance Requirement (e.g. Min 66,430 - Cost of basic VPS with public IP)
    if (service === "RESELLER") {
      if (user.balance < 66430) {
        return NextResponse.json({ 
          error: "Insufficient balance to generate Reseller API Key. Minimum balance required is Rp 66.430." 
        }, { status: 400 });
      }
      
      // Limit to 1 Reseller Key per user
      const existingResellerKey = await prisma.apiKey.findFirst({
        where: { userId: user.id, service: "RESELLER" }
      });
      if (existingResellerKey) {
        return NextResponse.json({ 
          error: "You can only have one active Reseller API key. Please revoke your existing key before generating a new one." 
        }, { status: 400 });
      }
    }

    // Generate Key
    const key = `masdika_${crypto.randomBytes(24).toString('hex')}`;

    const newKey = await prisma.apiKey.create({
      data: {
        name: name || "Reseller API Key",
        key,
        userId: user.id,
        service
      }
    });

    // Removed the invalid isReseller update since the field doesn't exist.
    // A user's reseller status is implied by possessing a RESELLER api key.

    return NextResponse.json({ success: true, apiKey: newKey });
  } catch (error) {
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
    const user = auth.user!;

    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: "Key ID required" }, { status: 400 });

    await prisma.apiKey.deleteMany({
      where: {
        id: Number(id),
        userId: user.id
      }
    });

    return NextResponse.json({ success: true, message: "API Key deleted successfully" });
  } catch (error) {
    console.error("API Keys DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
