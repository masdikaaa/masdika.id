import { loadEnvConfig } from "@next/env";
import path from "path";

// Support both monorepo root and standalone execution environments
const monorepoRoot = path.resolve(process.cwd(), "../../");
loadEnvConfig(monorepoRoot);
loadEnvConfig(process.cwd());

async function run() {
  console.log("==================================================================");
  console.log("🚀 [Masdika RustFS] Production Local Assets Migration Starting...");
  console.log("==================================================================");

  const { ensureDefaultRustFSSettings, migrateAllLocalAssetsToRustFS, testRustFSConnection } = await import("../src/lib/rustfs");
  const { prisma } = await import("../src/lib/prisma");

  try {
    // 1. Ensure DB settings and default bucket names are initialized
    console.log("[Migration Step 1/3] Ensuring RustFS bucket configurations in Database...");
    await ensureDefaultRustFSSettings();

    // 2. Test RustFS Connectivity & Bucket Existence
    console.log("[Migration Step 2/3] Verifying RustFS connection & bucket availability...");
    const conn = await testRustFSConnection();
    if (!conn.success) {
      console.warn("⚠️ [Migration Notice] RustFS connection not established:", conn.message);
      console.warn("⏭️ Skipping asset migration for now. All local files remain intact and will continue to be served via fallback.");
      return;
    }
    console.log("✅ [Migration] RustFS connected successfully!");

    // 3. Perform Unified Local Asset Migration
    console.log("[Migration Step 3/3] Scanning and transferring local production files:");
    console.log(" - apps/web/public/uploads   -> Bucket: masdika-media");
    console.log(" - apps/web/storage/tickets  -> Bucket: masdika-ticket");
    console.log(" - apps/web/storage/secure-media -> Bucket: masdika-cdn");

    const result = await migrateAllLocalAssetsToRustFS({ deleteLocalAfterUpload: true });

    console.log("==================================================================");
    console.log("🎉 [Migration Summary] RustFS Production Sync Completed:");
    console.log(` • Website Media (public/uploads): ${result.publicUploads.migrated} transferred, ${result.publicUploads.skipped} already in bucket, ${result.publicUploads.errors} errors`);
    console.log(` • Support Tickets (attachments): ${result.tickets.migrated} transferred, ${result.tickets.skipped} already in bucket, ${result.tickets.errors} errors`);
    console.log(` • Secure Media (File CDN): ${result.secureMedia.migrated} transferred, ${result.secureMedia.skipped} already in bucket, ${result.secureMedia.errors} errors`);
    console.log(`------------------------------------------------------------------`);
    console.log(` Total Transferred: ${result.totalMigrated} file(s)`);
    console.log(` Total Skipped:     ${result.totalSkipped} file(s)`);
    console.log(` Total Errors:      ${result.totalErrors} file(s)`);
    console.log("==================================================================");

  } catch (err: any) {
    console.error("❌ [Migration Error] Unexpected error during asset migration:", err?.message || err);
  } finally {
    try {
      await prisma.$disconnect();
    } catch {}
    process.exit(0);
  }
}

run();
