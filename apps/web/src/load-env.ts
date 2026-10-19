import path from "path";
import fs from "fs";
import { config } from "dotenv";

// Load .env from the monorepo root or local directory before any other module execution
const possiblePaths = [
  path.resolve(process.cwd(), "../../.env"),
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../../.env"),
  path.resolve(__dirname, "../../.env"),
];

for (const envPath of possiblePaths) {
  if (fs.existsSync(envPath)) {
    // In production (e.g. Docker/Kubernetes), don't overwrite environment variables injected by the container
    const isProduction = process.env.NODE_ENV === "production";
    config({ path: envPath, override: !isProduction });
    break;
  }
}
