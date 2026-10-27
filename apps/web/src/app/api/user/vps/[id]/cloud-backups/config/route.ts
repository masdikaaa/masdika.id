import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { testS3Storage, testGoogleDriveStorage } from "@/lib/cloud-storage";

export const dynamic = "force-dynamic";

// POST /api/user/vps/[id]/cloud-backups/config
// Saves cloud storage settings for the VPS
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
      gdriveFolderId,
      gdriveClientEmail,
      gdrivePrivateKey,
      autoSchedule,
      testNow
    } = body;

    if (!provider || !["R2", "S3", "GDRIVE"].includes(provider)) {
      return NextResponse.json({ error: "Invalid storage provider. Must be R2, S3, or GDRIVE." }, { status: 400 });
    }

    // Get existing config to preserve unchanged passwords/keys
    const existing = await prisma.vpsCloudBackupConfig.findUnique({
      where: { vpsId: vps.id }
    });

    const finalSecretAccessKey =
      secretAccessKey && !secretAccessKey.includes("••••")
        ? secretAccessKey.trim()
        : existing?.secretAccessKey || null;

    const finalPrivateKey =
      gdrivePrivateKey && !gdrivePrivateKey.includes("••••")
        ? gdrivePrivateKey.trim()
        : existing?.gdrivePrivateKey || null;

    const finalRefreshToken =
      body.gdriveRefreshToken !== undefined
        ? body.gdriveRefreshToken && !body.gdriveRefreshToken.includes("••••")
          ? body.gdriveRefreshToken.trim()
          : existing?.gdriveRefreshToken || null
        : existing?.gdriveRefreshToken || null;

    const configData = {
      provider,
      endpoint: endpoint ? endpoint.trim() : null,
      bucket: bucket ? bucket.trim() : null,
      region: region ? region.trim() : "auto",
      accessKeyId: accessKeyId ? accessKeyId.trim() : null,
      secretAccessKey: finalSecretAccessKey,
      pathPrefix: pathPrefix ? pathPrefix.trim() : `vps-${vps.vmid || vps.id}`,
      gdriveFolderId: gdriveFolderId ? gdriveFolderId.trim() : null,
      gdriveClientEmail: gdriveClientEmail ? gdriveClientEmail.trim() : null,
      gdrivePrivateKey: finalPrivateKey,
      gdriveRefreshToken: finalRefreshToken,
      autoSchedule: autoSchedule || "DISABLED"
    };

    // Optional quick test if requested
    let testResult: { success: boolean; message: string } | null = null;
    if (testNow) {
      if (provider === "R2" || provider === "S3") {
        testResult = await testS3Storage(configData);
      } else if (provider === "GDRIVE") {
        testResult = await testGoogleDriveStorage(configData);
      }
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
        hasSecretKey: Boolean(savedConfig.secretAccessKey),
        gdrivePrivateKey: savedConfig.gdrivePrivateKey ? "••••••••••••••••" : null,
        hasPrivateKey: Boolean(savedConfig.gdrivePrivateKey),
        gdriveRefreshToken: savedConfig.gdriveRefreshToken ? "••••••••" : null,
        hasRefreshToken: Boolean(savedConfig.gdriveRefreshToken)
      }
    });
  } catch (error: any) {
    console.error("Save cloud backup config error:", error);
    return NextResponse.json({ error: error.message || "Failed to save configuration" }, { status: 500 });
  }
}
