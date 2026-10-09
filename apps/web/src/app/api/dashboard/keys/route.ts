import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: auth.userId },
      orderBy: { createdAt: "desc" }
    });

    const { getSubscriptionInfo } = await import('@/lib/subscription');
    const enrichedKeys = await Promise.all(keys.map(async (key) => {
      let isSuspended = false;
      if (key.service) {
        const subInfo = await getSubscriptionInfo(auth.userId!, key.service);
        isSuspended = subInfo.isSuspended;
      } else if (key.projectId) {
        // Handle project case if necessary, assuming mostly service-based for API Hub
      }
      return { ...key, isSuspended };
    }));

    return NextResponse.json(enrichedKeys);
  } catch (error) {
    console.error("Failed to fetch API keys:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { name, service } = await req.json();

    if (!service || service === 'OBJECT_STORAGE') {
      return NextResponse.json({ error: "Invalid service or service not permitted for API Hub keys" }, { status: 400 });
    }

    // Check if user has an active subscription for this service
    const activeSub = await prisma.subscription.findFirst({
      where: {
        userId: auth.userId!,
        status: 'ACTIVE',
        plan: { service }
      }
    });

    if (!activeSub && auth.user?.role !== 'ADMIN') {
      return NextResponse.json({ error: "You don't have an active subscription for this service" }, { status: 403 });
    }

    const existingKey = await prisma.apiKey.findFirst({
      where: {
        userId: auth.userId!,
        service
      }
    });

    if (existingKey) {
      return NextResponse.json({ error: `You already have an API key for ${service}. Only one key per service is allowed.` }, { status: 400 });
    }

    const newKey = await prisma.apiKey.create({
      data: {
        userId: auth.userId!,
        service,
        key: `masdika_${uuidv4().replace(/-/g, "")}`,
        name: name || "Default Key"
      }
    });

    return NextResponse.json(newKey);
  } catch (error) {
    console.error("Failed to generate API key:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "Key ID required" }, { status: 400 });
    }

    const key = await prisma.apiKey.findUnique({ where: { id: Number(keyId) } });

    if (!key || key.userId !== auth.userId) {
      return NextResponse.json({ error: "Key not found or unauthorized" }, { status: 404 });
    }

    await prisma.apiKey.delete({
      where: { id: Number(keyId) }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete API key:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
