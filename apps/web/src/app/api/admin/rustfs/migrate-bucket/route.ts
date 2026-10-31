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

    if (!target || !target.endpoint || !target.accessKey || !target.secretKey) {
      return NextResponse.json(
        { error: "Target endpoint, accessKey, and secretKey are required." },
        { status: 400 }
      );
    }

    const result = await migrateBucketToBucket({
      source,
      target: {
        ...target,
        cdnBucket: target.cdnBucket || target.bucket || 'masdika-cdn',
        mediaBucket: target.mediaBucket || 'masdika-media',
        ticketBucket: target.ticketBucket || 'masdika-ticket',
      },
      deleteSourceAfterTransfer: Boolean(deleteSourceAfterTransfer),
      updateActiveConfig: Boolean(updateActiveConfig)
    });

    const cdnCount = result.categories?.cdn?.migrated || 0;
    const mediaCount = result.categories?.media?.migrated || 0;
    const ticketCount = result.categories?.ticket?.migrated || 0;

    return NextResponse.json({
      success: true,
      message: `Cross-server migration completed! CDN: ${cdnCount} transferred, Media: ${mediaCount} transferred, Tickets: ${ticketCount} transferred. Total: ${result.migrated} transferred, ${result.skipped} already present, ${result.errors} errors.`,
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
