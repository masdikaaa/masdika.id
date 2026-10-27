import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST /api/user/vps/[id]/cloud-backups/gdrive/disconnect
// Clears Personal Google Drive OAuth refresh token for this VPS
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(id), userId: auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });

    const existing = await prisma.vpsCloudBackupConfig.findUnique({
      where: { vpsId: vps.id }
    });

    if (existing) {
      await prisma.vpsCloudBackupConfig.update({
        where: { id: existing.id },
        data: {
          gdriveRefreshToken: null,
          lastStatus: "CONFIGURED",
          lastError: null
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: "Personal Google Drive disconnected successfully"
    });
  } catch (error: any) {
    console.error("Disconnect GDrive error:", error);
    return NextResponse.json({ error: error.message || "Failed to disconnect Google Drive" }, { status: 500 });
  }
}
