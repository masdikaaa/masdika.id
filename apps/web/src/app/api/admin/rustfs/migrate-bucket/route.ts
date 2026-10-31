import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { migrateBucketToBucket } from "@/lib/rustfs";

export const maxDuration = 300; // 5 minutes for large bucket migrations
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { target, source, deleteSourceAfterTransfer, updateActiveConfig } = body;

    if (!target || !target.endpoint || !target.accessKey || !target.secretKey || !target.bucket) {
      return NextResponse.json(
        { error: "Target endpoint, accessKey, secretKey, and bucket are required." },
        { status: 400 }
      );
    }

    const result = await migrateBucketToBucket({
      source,
      target,
      deleteSourceAfterTransfer: Boolean(deleteSourceAfterTransfer),
      updateActiveConfig: Boolean(updateActiveConfig)
    });

    return NextResponse.json({
      success: true,
      message: `Bucket migration completed: ${result.migrated} transferred, ${result.skipped} already present, ${result.errors} errors.`,
      result
    });
  } catch (error: any) {
    console.error("[RustFS Migrate Bucket API Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to migrate bucket" },
      { status: 500 }
    );
  }
}

