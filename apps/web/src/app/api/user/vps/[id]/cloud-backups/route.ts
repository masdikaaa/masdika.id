import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET /api/user/vps/[id]/cloud-backups
// Fetches configuration and backup history for this VPS
export async function GET(
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

    const config = await prisma.vpsCloudBackupConfig.findUnique({
      where: { vpsId: vps.id }
    });

    const records = await prisma.vpsCloudBackupRecord.findMany({
      where: { vpsId: vps.id },
      orderBy: { createdAt: "desc" },
      take: 50
    });

    // Mask secret keys before sending to frontend
    const sanitizedConfig = config
      ? {
          ...config,
          secretAccessKey: config.secretAccessKey ? "••••••••••••••••" : null,
          hasSecretKey: Boolean(config.secretAccessKey),
          gdrivePrivateKey: config.gdrivePrivateKey ? "••••••••••••••••" : null,
          hasPrivateKey: Boolean(config.gdrivePrivateKey),
          gdriveRefreshToken: config.gdriveRefreshToken ? "••••••••" : null
        }
      : null;

    // Convert BigInt fileSize to number or string for JSON serialization
    const serializedRecords = records.map((rec) => ({
      ...rec,
      fileSize: Number(rec.fileSize)
    }));

    return NextResponse.json({
      success: true,
      config: sanitizedConfig,
      records: serializedRecords
    });
  } catch (error: any) {
    console.error("Get cloud backups error:", error);
    return NextResponse.json({ error: error.message || "Failed to fetch cloud backups" }, { status: 500 });
  }
}
