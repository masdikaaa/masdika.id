import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { testS3Storage } from "@/lib/cloud-storage";

export const dynamic = "force-dynamic";

// POST /api/user/vps/[id]/cloud-backups/config
// Saves cloud storage settings for the VPS (Cloudflare R2 or AWS S3)
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

    const body = await req.json();
    const {
      provider,
      endpoint,
      bucket,
      region,
      accessKeyId,
      secretAccessKey,
      pathPrefix,
      autoSchedule,
      testNow
    } = body;

    if (!provider || !["R2", "S3"].includes(provider)) {
      return NextResponse.json({ error: "Invalid storage provider. Must be R2 or S3." }, { status: 400 });
    }

    // Get existing config to preserve unchanged secret keys
    const existing = await prisma.vpsCloudBackupConfig.findUnique({
      where: { vpsId: vps.id }
    });

    const finalSecretAccessKey =
      secretAccessKey && !secretAccessKey.includes("••••")
        ? secretAccessKey.trim()
        : existing?.secretAccessKey || null;

    const configData = {
      provider,
      endpoint: endpoint ? endpoint.trim() : null,
      bucket: bucket ? bucket.trim() : null,
      region: region ? region.trim() : "auto",
      accessKeyId: accessKeyId ? accessKeyId.trim() : null,
      secretAccessKey: finalSecretAccessKey,
      pathPrefix: pathPrefix ? pathPrefix.trim() : `vps-${vps.vmid || vps.id}`,
      autoSchedule: autoSchedule || "DISABLED"
    };

    // Optional quick test if requested
    let testResult: { success: boolean; message: string } | null = null;
    if (testNow) {
      testResult = await testS3Storage(configData);
    }

    const savedConfig = await prisma.vpsCloudBackupConfig.upsert({
      where: { vpsId: vps.id },
      create: {
        vpsId: vps.id,
        ...configData,
        lastStatus: testResult ? (testResult.success ? "CONNECTED" : "ERROR") : existing?.lastStatus || "CONFIGURED",
        lastError: testResult && !testResult.success ? testResult.message : null
      },
      update: {
        ...configData,
        lastStatus: testResult ? (testResult.success ? "CONNECTED" : "ERROR") : existing?.lastStatus || "CONFIGURED",
        lastError: testResult && !testResult.success ? testResult.message : null
      }
    });

    return NextResponse.json({
      success: true,
      message: "Cloud backup configuration saved successfully",
      testResult,
      config: {
        ...savedConfig,
        secretAccessKey: savedConfig.secretAccessKey ? "••••••••••••••••" : null,
        hasSecretKey: Boolean(savedConfig.secretAccessKey)
      }
    });
  } catch (error: any) {
    console.error("Save cloud backup config error:", error);
    return NextResponse.json({ error: error.message || "Failed to save configuration" }, { status: 500 });
  }
}
