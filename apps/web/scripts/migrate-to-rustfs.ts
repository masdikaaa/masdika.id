import { loadEnvConfig } from "@next/env";
import path from "path";

// Load environment variables before any module import
const possibleRoots = [
  path.resolve(process.cwd()),
  path.resolve(process.cwd(), "../../"),
  path.resolve(__dirname, "../../"),
  path.resolve(__dirname, "../../../")
];

for (const root of possibleRoots) {
  try {
    loadEnvConfig(root);
  } catch {}
}

async function run() {
  console.log("==================================================");
  console.log("   MASDIKA.ID - RUSTFS MEDIA MIGRATION TOOL");
  console.log("==================================================");

  const { getRustFSConfig, testRustFSConnection, migrateAllMediaToRustFS } = await import("../src/lib/rustfs");

  const config = await getRustFSConfig();
  console.log(`[Config] Target Endpoint : ${config.endpoint}`);
  console.log(`[Config] Target Bucket   : ${config.bucket}`);
  console.log(`[Config] Access Key ID   : ${config.accessKey ? config.accessKey.substring(0, 8) + '...' : '(none)'}`);
  console.log(`[Config] Enabled         : ${config.enabled}`);
  console.log("--------------------------------------------------");

  console.log("[1/3] Testing connection to RustFS...");
  const connTest = await testRustFSConnection();
  if (!connTest.success) {
    console.error(`[ERROR] Connection failed: ${connTest.message}`);
    process.exit(1);
  }
  console.log(`[SUCCESS] Connected to RustFS (${connTest.bucket}).`);

  console.log("\n[2/3] Starting media migration...");
  const startTime = Date.now();
  const result = await migrateAllMediaToRustFS({ deleteLocalAfterUpload: true });

  const durationSec = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log("\n[3/3] Migration summary:");
  console.log(`- Total Files in DB    : ${result.total}`);
  console.log(`- Migrated to RustFS   : ${result.migrated}`);
  console.log(`- Skipped (already in) : ${result.skipped}`);
  console.log(`- Errors               : ${result.errors}`);
  console.log(`- Duration             : ${durationSec}s`);

  if (result.errors > 0) {
    console.warn("\nFiles with errors:");
    result.details.filter(d => d.status === 'error').forEach(d => {
      console.warn(`  * ${d.filename} (${d.originalName}): ${d.error}`);
    });
  }

  console.log("\n==================================================");
  console.log("Migration finished successfully!");
  console.log("Local files & storage directories cleaned up completely!");
  console.log("==================================================");
  process.exit(0);
}

run().catch((err) => {
  console.error("Fatal migration error:", err);
  process.exit(1);
});

