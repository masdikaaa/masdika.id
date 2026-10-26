import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { deleteFromS3, deleteFromGoogleDrive } from "@/lib/cloud-storage";

export const dynamic = "force-dynamic";

export async function DELETE(
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

    const config = await prisma.vpsCloudBackupConfig.findUnique({
      where: { vpsId: vps.id }
    });

    // Attempt remote deletion if config is available
    if (config) {
      try {
        if (record.provider === "R2" || record.provider === "S3") {
          await deleteFromS3(config, record.targetKey);
        } else if (record.provider === "GDRIVE") {
          await deleteFromGoogleDrive(config, record.targetKey);
        }
      } catch (delRemoteErr) {
        console.warn("Failed to delete remote file from cloud storage:", delRemoteErr);
        // Continue to delete record from DB anyway
      }
    }

    await prisma.vpsCloudBackupRecord.delete({
      where: { id: record.id }
    });

    return NextResponse.json({
      success: true,
      message: "Backup deleted successfully"
    });
  } catch (error: any) {
    console.error("Delete cloud backup error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete backup" }, { status: 500 });
  }
}
