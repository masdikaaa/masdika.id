import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-middleware";

export const dynamic = "force-dynamic";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
    const userId = auth.userId!;

    const { id } = await params;
    const keyId = parseInt(id, 10);
    if (isNaN(keyId)) {
      return NextResponse.json({ error: "Invalid key ID" }, { status: 400 });
    }

    const existing = await prisma.userSshKey.findFirst({
      where: { id: keyId, userId }
    });

    if (!existing) {
      return NextResponse.json({ error: "SSH Key not found" }, { status: 404 });
    }

    await prisma.userSshKey.delete({
      where: { id: keyId }
    });

    return NextResponse.json({ success: true, message: "SSH Key deleted successfully" });
  } catch (error: any) {
    console.error("[SSH_KEY_DELETE]", error);
    return NextResponse.json({ error: error.message || "Failed to delete SSH key" }, { status: 500 });
  }
}

