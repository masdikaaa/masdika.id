import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { getS3PresignedDownloadUrl } from "@/lib/cloud-storage";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; recordId: string }> }
) {
  try {
    const { id, recordId } = await params;
    const auth = await requireAuth({ allowedRoles: ["USER", "ADMIN"] });
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const vps = await prisma.vpsService.findUnique({
      where: { id: parseInt(id), userId: auth.userId }
    });

    if (!vps) return NextResponse.json({ error: "VPS not found" }, { status: 404 });

    const record = await prisma.vpsCloudBackupRecord.findUnique({
      where: { id: parseInt(recordId), vpsId: vps.id }
    });

    if (!record) return NextResponse.json({ error: "Backup record not found" }, { status: 404 });
    if (record.status !== "COMPLETED") {
      return NextResponse.json({ error: `Backup is not completed (status: ${record.status})` }, { status: 400 });
    }

    const config = await prisma.vpsCloudBackupConfig.findUnique({
      where: { vpsId: vps.id }
    });

    if (!config) return NextResponse.json({ error: "Cloud storage configuration not found" }, { status: 404 });

    let downloadUrl = record.downloadUrl;

    if (record.provider === "R2" || record.provider === "S3") {
      // Generate a fresh 1-hour presigned URL
      downloadUrl = await getS3PresignedDownloadUrl(config, record.targetKey, 3600);
    } else if (record.provider === "GDRIVE") {
      downloadUrl = downloadUrl || `https://drive.google.com/file/d/${record.targetKey}/view`;
    }

    if (!downloadUrl) {
      return NextResponse.json({ error: "Could not generate download URL" }, { status: 500 });
    }

    // If client requested JSON
    const acceptHeader = req.headers.get("accept") || "";
    if (acceptHeader.includes("application/json") || req.nextUrl.searchParams.get("format") === "json") {
      return NextResponse.json({ success: true, downloadUrl });
    }

    return NextResponse.redirect(downloadUrl);
  } catch (error: any) {
    console.error("Download cloud backup error:", error);
    return NextResponse.json({ error: error.message || "Failed to get download URL" }, { status: 500 });
  }
}
