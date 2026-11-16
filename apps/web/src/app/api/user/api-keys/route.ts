import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { LIVE_VPS_STATUSES } from "@/lib/vps-api";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const [apiKeys, vpsCount] = await Promise.all([
      prisma.apiKey.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.vpsService.count({
        where: {
          userId: user.id,
          status: { in: LIVE_VPS_STATUSES },
        },
      }),
    ]);

    return NextResponse.json({ 
      success: true, 
      apiKeys,
      hasVps: vpsCount > 0,
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
    const { name, service = "VPS" } = body;
    const normalizedService = typeof service === "string" ? service.trim().toUpperCase() : "VPS";

    if (
      normalizedService !== "VPS" &&
      normalizedService !== "RESELLER" &&
      normalizedService !== "AI" &&
      normalizedService !== "ALL"
    ) {
      return NextResponse.json({ error: "Unsupported API key service type" }, { status: 400 });
    }

    const safeName = typeof name === "string" && name.trim().length > 0
      ? name.trim().slice(0, 64)
      : normalizedService === "AI"
      ? "AI Management Key"
      : normalizedService === "ALL"
      ? "Account Master Key"
      : "VPS API Key";

    const key = `masdika_${crypto.randomBytes(24).toString('hex')}`;

    const newKey = await prisma.$transaction(async (tx) => {
      if (normalizedService === "VPS" || normalizedService === "RESELLER") {
        const vpsCount = await tx.vpsService.count({
          where: {
            userId: user.id,
            status: { in: LIVE_VPS_STATUSES },
          },
        });
        if (vpsCount === 0) {
          throw new Error("NO_VPS_ORDERED");
        }
      }

      const existingCount = await tx.apiKey.count({
        where: { userId: user.id }
      });
      if (existingCount >= 5) {
        throw new Error("KEY_LIMIT_REACHED");
      }

      return tx.apiKey.create({
        data: {
          name: safeName,
          key,
          userId: user.id,
          service: normalizedService
        }
      });
    });

    return NextResponse.json({ success: true, apiKey: newKey });
  } catch (error: any) {
    if (error?.message === "NO_VPS_ORDERED") {
      return NextResponse.json({
        error: "You must order at least one Cloud VPS instance before generating an API key."
      }, { status: 403 });
    }
    if (error?.message === "KEY_LIMIT_REACHED") {
      return NextResponse.json({ 
        error: "Maximum limit of 5 API keys reached. Please revoke an existing key before generating a new one." 
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
