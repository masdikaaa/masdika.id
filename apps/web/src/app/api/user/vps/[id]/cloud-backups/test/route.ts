import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { testS3Storage } from "@/lib/cloud-storage";

export const dynamic = "force-dynamic";

// POST /api/user/vps/[id]/cloud-backups/test
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

    const body = await req.json().catch(() => ({}));
    const existing = await prisma.vpsCloudBackupConfig.findUnique({
      where: { vpsId: vps.id }
    });

    const provider = body.provider || existing?.provider || "R2";
    if (provider !== "R2" && provider !== "S3") {
      return NextResponse.json({ success: false, message: "Unsupported provider. Only R2 and S3 are supported." }, { status: 400 });
    }

    const secretAccessKey =
      body.secretAccessKey && !body.secretAccessKey.includes("••••")
        ? body.secretAccessKey.trim()
        : existing?.secretAccessKey;

    const configToTest = {
      provider,
      endpoint: body.endpoint !== undefined ? body.endpoint : existing?.endpoint,
      bucket: body.bucket !== undefined ? body.bucket : existing?.bucket,
      region: body.region !== undefined ? body.region : existing?.region,
      accessKeyId: body.accessKeyId !== undefined ? body.accessKeyId : existing?.accessKeyId,
      secretAccessKey,
      pathPrefix: body.pathPrefix !== undefined ? body.pathPrefix : existing?.pathPrefix
    };

    const result = await testS3Storage(configToTest);

    if (existing) {
      await prisma.vpsCloudBackupConfig.update({
        where: { id: existing.id },
        data: {
          lastStatus: result.success ? "CONNECTED" : "ERROR",
          lastError: result.success ? null : result.message
        }
      });
    }

    return NextResponse.json({
      success: result.success,
      message: result.message
    });
  } catch (error: any) {
    console.error("Test cloud backup connection error:", error);
    return NextResponse.json({ success: false, message: error.message || "Failed to test connection" }, { status: 500 });
  }
}
