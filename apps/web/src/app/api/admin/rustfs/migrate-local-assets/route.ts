import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { migrateAllLocalAssetsToRustFS, ensureDefaultRustFSSettings, testRustFSConnection } from "@/lib/rustfs";

export const maxDuration = 300; // 5 minutes for bulk asset transfers
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const conn = await testRustFSConnection();
    if (!conn.success) {
      return NextResponse.json({
        success: false,
        message: `RustFS connection failed: ${conn.message}`
      }, { status: 400 });
    }

    await ensureDefaultRustFSSettings();
    const result = await migrateAllLocalAssetsToRustFS({ deleteLocalAfterUpload: true });

    return NextResponse.json({
      success: true,
      message: `Production asset migration completed: ${result.totalMigrated} transferred, ${result.totalSkipped} skipped, ${result.totalErrors} errors.`,
      result
    });
  } catch (error: any) {
    console.error("[RustFS Migrate Local Assets API Error]:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Failed to migrate local assets" },
      { status: 500 }
    );
  }
}
