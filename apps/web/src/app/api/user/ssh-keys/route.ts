import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { parseAndValidateSshKey } from "@/lib/ssh-key-utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const userId = auth.userId!;

    const keys = await prisma.userSshKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    return NextResponse.json({ success: true, keys });
  } catch (error: any) {
    console.error("[SSH_KEYS_GET]", error);
    return NextResponse.json({ error: error.message || "Failed to fetch SSH keys" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const userId = auth.userId!;

    const body = await req.json();
    const { name, publicKey } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Key name is required" }, { status: 400 });
    }

    const trimmedName = name.trim().slice(0, 64);

    const validation = parseAndValidateSshKey(publicKey);
    if (!validation.isValid) {
      return NextResponse.json({ error: validation.error || "Invalid SSH Public Key" }, { status: 400 });
    }

    const trimmedKey = publicKey.trim();

    // Check key limit per user (e.g. max 25 keys)
    const existingCount = await prisma.userSshKey.count({ where: { userId } });
    if (existingCount >= 25) {
      return NextResponse.json({ error: "Maximum limit of 25 SSH keys reached" }, { status: 400 });
    }

    // Check duplicate
    const duplicate = await prisma.userSshKey.findFirst({
      where: {
        userId,
        OR: [
          { name: trimmedName },
          { publicKey: trimmedKey }
        ]
      }
    });

    if (duplicate) {
      return NextResponse.json({
        error: duplicate.name === trimmedName
          ? "An SSH key with this name already exists"
          : "This public key is already registered in your account"
      }, { status: 400 });
    }

    const createdKey = await prisma.userSshKey.create({
      data: {
        userId,
        name: trimmedName,
        publicKey: trimmedKey,
        fingerprint: validation.fingerprint,
        keyType: validation.keyType
      }
    });

    return NextResponse.json({ success: true, key: createdKey }, { status: 201 });
  } catch (error: any) {
    console.error("[SSH_KEYS_POST]", error);
    return NextResponse.json({ error: error.message || "Failed to create SSH key" }, { status: 500 });
  }
}

