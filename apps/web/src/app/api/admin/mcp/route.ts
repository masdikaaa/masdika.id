import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { decryptDeterministic } from "@/lib/encryption";
import { MASDIKA_MCP_TOOLS } from "@/lib/mcp-schema";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const mcpKeys = await prisma.apiKey.findMany({
      where: { service: "MCP" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            balance: true,
            isSuspended: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const enrichedKeys = mcpKeys.map((k) => {
      const rawName = k.user?.name || "";
      const rawEmail = k.user?.email || "";
      const decryptedName = decryptDeterministic(rawName) || rawName || "Customer";
      const decryptedEmail = decryptDeterministic(rawEmail) || rawEmail || "user@masdika.id";

      return {
        id: k.id,
        name: k.name,
        key: k.key,
        maskedKey: `${k.key.slice(0, 12)}...${k.key.slice(-4)}`,
        status: k.status,
        usageCount: k.usageCount || 0,
        lastUsed: k.lastUsed,
        createdAt: k.createdAt,
        user: {
          id: k.user.id,
          name: decryptedName,
          email: decryptedEmail,
          balance: k.user.balance,
          isSuspended: k.user.isSuspended,
        },
      };
    });

    const stats = {
      totalKeys: enrichedKeys.length,
      activeKeys: enrichedKeys.filter((k) => k.status === "ACTIVE").length,
      suspendedKeys: enrichedKeys.filter((k) => k.status !== "ACTIVE").length,
      totalInvocations: enrichedKeys.reduce((acc, curr) => acc + curr.usageCount, 0),
      toolsCount: MASDIKA_MCP_TOOLS.length,
    };

    return NextResponse.json({
      success: true,
      keys: enrichedKeys,
      stats,
      tools: MASDIKA_MCP_TOOLS,
    });
  } catch (error: any) {
    console.error("[ADMIN_MCP_GET_ERROR]", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { id, status } = body;

    const keyId = Number(id);
    if (!Number.isSafeInteger(keyId) || keyId <= 0) {
      return NextResponse.json({ error: "Valid Key ID required." }, { status: 400 });
    }

    if (status !== "ACTIVE" && status !== "SUSPENDED") {
      return NextResponse.json({ error: "Status must be ACTIVE or SUSPENDED." }, { status: 400 });
    }

    const updated = await prisma.apiKey.update({
      where: { id: keyId },
      data: { status },
    });

    return NextResponse.json({ success: true, key: updated });
  } catch (error: any) {
    console.error("[ADMIN_MCP_PUT_ERROR]", error);
    return NextResponse.json({ error: "Failed to update MCP key status." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await req.json();
    const { id } = body;

    const keyId = Number(id);
    if (!Number.isSafeInteger(keyId) || keyId <= 0) {
      return NextResponse.json({ error: "Valid Key ID required." }, { status: 400 });
    }

    await prisma.apiKey.delete({
      where: { id: keyId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[ADMIN_MCP_DELETE_ERROR]", error);
    return NextResponse.json({ error: "Failed to revoke MCP key." }, { status: 500 });
  }
}
