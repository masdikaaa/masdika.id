import { loadEnvConfig } from "@next/env";
import path from "path";
import fs from "fs";

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
    // 0. Security Cleanup Sweep: Detect and delete unauthorized script files (.php, .sh, etc.)
    console.log("[Security Sweep] Scanning for unauthorized script files in uploads...");
    const candidateDirs = [
      path.join(process.cwd(), 'apps', 'web', 'public', 'uploads'),
      path.join(process.cwd(), 'public', 'uploads'),
      '/app/apps/web/public/uploads',
    ].filter((d, i, arr) => arr.indexOf(d) === i && fs.existsSync(d));

    const DANGEROUS_EXTS = ['.php', '.phtml', '.php3', '.php4', '.php5', '.phps', '.sh', '.bash', '.exe', '.py', '.pl', '.cgi', '.bat', '.cmd'];
    let removedScriptsCount = 0;

    function sweepDangerousFiles(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          sweepDangerousFiles(fullPath);
        } else if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (DANGEROUS_EXTS.includes(ext) || (entry.name.startsWith('avatar-') && ext === '.txt')) {
            try {
              fs.unlinkSync(fullPath);
              console.log(`🚨 [Security Sweep] Removed unauthorized/malicious file: ${entry.name}`);
              removedScriptsCount++;
            } catch (e) {
              console.warn(`Could not remove ${fullPath}:`, e);
            }
          }
        }
      }
    }

    for (const d of candidateDirs) {
      sweepDangerousFiles(d);
    }
    if (removedScriptsCount > 0) {
      console.log(`✅ [Security Sweep] Cleaned up ${removedScriptsCount} unauthorized script file(s).`);
    } else {
      console.log(`✅ [Security Sweep] No unauthorized script files found.`);
    }

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
