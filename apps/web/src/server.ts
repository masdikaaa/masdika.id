import path from "path";
import { config } from "dotenv";
// Always load from the monorepo root .env (2 levels up from apps/web)
config({ path: path.resolve(__dirname, "../../../.env"), override: true });

const apm = require("elastic-apm-node");
if (process.env.APM_SERVER_URL) {
  apm.start({
    serviceName: 'masdika-web',
    serverUrl: process.env.APM_SERVER_URL,
    environment: process.env.NODE_ENV || 'development',
    active: true // active by default if URL is provided
  });
  console.log(`> [APM] Elastic APM started for masdika-web`);
}


import { createServer } from "http";
import next from "next";
import { WebSocketServer, WebSocket } from "ws";
import https from "https";
import { handleVncUpgrade } from "./lib/vnc-proxy-handler";

const parseCookie = (str: string) => {
  if (!str) return {};
  return str.split(";").reduce((acc, v) => {
    const [key, val] = v.split("=");
    if (key && val !== undefined) acc[decodeURIComponent(key.trim())] = decodeURIComponent(val.trim());
    return acc;
  }, {} as Record<string, string>);
};
import { verifySessionToken } from "./lib/session";
import cron from "node-cron";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = 3000;

// Initialize Next.js
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  const upgradeHandler = app.getUpgradeHandler();

  const server = createServer(async (req, res) => {
    try {
      const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
      const normalizedPathname = reqUrl.pathname.replace(/\/+/g, '/');

      if (apm.isStarted()) {
        // Ganti angka ID dan UUID menjadi :id agar metrik di APM terkumpul rapi (tidak mencar)
        const genericPath = normalizedPathname
          .replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/ig, '/:id')
          .replace(/\/\d+/g, '/:id');
        apm.setTransactionName(`${req.method} ${genericPath}`);
      }

      // Intercept large raw file uploads to bypass Next.js 10MB body limit
      // Works for any route ending with /upload-raw (e.g. /api/admin/secure-media/upload-raw)
      if (req.method === "POST" && normalizedPathname.endsWith("/upload-raw")) {
        const crypto = require("crypto");
        const fs = require("fs");
        const path = require("path");
        const http = require("http");

        const targetPath = normalizedPathname.replace(/\/upload-raw$/, "/upload");

        // Auth check - ensure either admin or user session exists before allowing arbitrary disk writes (except for public upload)
        const isPublicUpload = normalizedPathname.startsWith("/api/public/upload-raw");
        const cookieHeader = req.headers.cookie || "";
        const cookies = parseCookie(cookieHeader);
        const sessionToken = cookies["admin_session"] || cookies["user_session"];

        if (!isPublicUpload && (!sessionToken || !verifySessionToken(sessionToken))) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }

        const uploadToken = crypto.randomUUID();
        const tempPath = path.join(process.cwd(), "storage", "upload-buffers", uploadToken);

        await fs.promises.mkdir(path.dirname(tempPath), { recursive: true });
        const ws = fs.createWriteStream(tempPath);

        // Limit upload size to 100MB for public, 5GB for authenticated users/admins
        const MAX_FILE_SIZE = isPublicUpload ? 100 * 1024 * 1024 : 5 * 1024 * 1024 * 1024;
        let uploadedBytes = 0;
        let isAborted = false;

        req.on('data', (chunk) => {
          uploadedBytes += chunk.length;
          if (uploadedBytes > MAX_FILE_SIZE) {
            isAborted = true;
            req.destroy();
            ws.destroy();
            fs.unlink(tempPath, () => { });
            if (!res.headersSent) {
              res.statusCode = 413;
              res.end(JSON.stringify({ error: "Payload Too Large (Max 5GB)" }));
            }
          }
        });

        req.pipe(ws);

        try {
          await new Promise((resolve, reject) => {
            req.on("end", resolve);
            req.on("error", reject);
            ws.on("error", reject);
            req.on("close", () => {
              if (isAborted) reject(new Error("File too large"));
            });
          });
        } catch (err: any) {
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Upload failed" }));
          }
          return;
        }

        const nextReqHeaders = { ...req.headers, "x-upload-token": uploadToken };
        delete nextReqHeaders["content-length"];
        delete nextReqHeaders["content-type"];

        const options = {
          hostname,
          port,
          path: targetPath,
          method: "POST",
          headers: nextReqHeaders
        };

        const proxyReq = http.request(options, (proxyRes: any) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
          proxyRes.pipe(res);
        });

        proxyReq.on("error", (err: any) => {
          console.error("[Upload Proxy] Error:", err);
          res.statusCode = 500;
          res.end(JSON.stringify({ error: "Internal proxy error" }));
        });

        proxyReq.end();
        return;
      }

      // Let Next.js handle all other HTTP requests
      await handle(req, res);
    } catch (err) {
      console.error("Error occurred handling", req.url, err);
      res.statusCode = 500;
      res.end("internal server error");
    }
  });

  server.on("upgrade", async (req: any, socket: any, head: any) => {
    const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const normalizedPathname = reqUrl.pathname.replace(/\/+/g, '/');

    if (normalizedPathname !== "/api/ws/vnc") {
      upgradeHandler(req, socket, head);
      return;
    }

    handleVncUpgrade(req, socket, head);
  });

  server.listen(port, () => {
    console.log(`> [CUSTOM SERVER] Running with WebSocket Support`);
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> WebSocket VNC Proxy ready on ws://${hostname}:${port}/api/ws/vnc`);
  });

  // ========================================
  // CRON JOBS SETUP
  // ========================================
  const cronSecret = process.env.CRON_SECRET || 'secret';

  const setupCronJob = (schedule: string, endpoint: string) => {
    cron.schedule(schedule, async () => {
      try {
        const res = await fetch(`http://localhost:${port}/api/cron/${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${cronSecret}`
          }
        });
        if (!res.ok) {
          console.error(`[CRON] /api/cron/${endpoint} failed with status ${res.status}`);
        } else {
          console.log(`[CRON] /api/cron/${endpoint} executed successfully`);
        }
      } catch (err) {
        console.error(`[CRON] Error executing /api/cron/${endpoint}:`, err);
      }
    }, {
      timezone: "Asia/Jakarta"
    });
  };

  // 1. /api/cron/billing - 0 0 * * *
  setupCronJob('0 0 * * *', 'billing');

  // 2. /api/cron/backups - 15 * * * *
  setupCronJob('15 * * * *', 'backups');

  // 3. /api/cron/hourly-billing - * * * * *
  setupCronJob('* * * * *', 'hourly-billing');

  // 4. /api/cron/cleanup - 0 * * * *
  setupCronJob('0 * * * *', 'cleanup');


  // 6. /api/cron/resource-monitor - */5 * * * *
  setupCronJob('*/5 * * * *', 'resource-monitor');

  // 7. /api/cron/chat-cleanup - */30 * * * *
  setupCronJob('*/30 * * * *', 'chat-cleanup');

  // 8. /api/cron/vps-scheduler - * * * * * (Auto Scheduler - every minute for near-realtime)
  setupCronJob('* * * * *', 'vps-scheduler');

  console.log(`> Node-Cron Scheduler started (No-Redis fallback)`);

});
