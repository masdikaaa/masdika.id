import "./load-env";
import path from "path";

const apm = require("elastic-apm-node");
(globalThis as any).elasticApm = apm;
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
      // Strictly restricted to authenticated Admin Secure Media & Customer CDN routes
      if (req.method === "POST" && normalizedPathname.endsWith("/upload-raw")) {
        const ALLOWED_RAW_UPLOAD_PATHS = new Set([
          "/api/admin/secure-media/upload-raw",
          "/api/user/cdn/upload-raw",
        ]);
        if (!ALLOWED_RAW_UPLOAD_PATHS.has(normalizedPathname)) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "Forbidden upload endpoint" }));
          return;
        }

        const crypto = require("crypto");
        const fs = require("fs");
        const path = require("path");
        const http = require("http");
        const { hasForbiddenExtension } = await import("./lib/upload-security");

        const targetPath = normalizedPathname.replace(/\/upload-raw$/, "/upload");

        // Strict Auth Check - require valid authenticated session (and DB revocation/role check) before touching disk
        const cookieHeader = req.headers.cookie || "";
        const cookies = parseCookie(cookieHeader);
        const sessionToken = cookies["admin_session"] || cookies["user_session"];
        const { getSessionPayload } = await import("./lib/session");
        const { prisma } = await import("./lib/prisma");

        const payload = sessionToken ? getSessionPayload(sessionToken) : null;
        if (!payload?.userId) {
          res.statusCode = 401;
          res.end(JSON.stringify({ error: "Unauthorized" }));
          return;
        }

        if (payload.sessionId) {
          const sessionLog = await prisma.loginLog.findFirst({
            where: { sessionId: payload.sessionId },
            select: { isRevoked: true }
          });
          if (sessionLog?.isRevoked) {
            res.statusCode = 401;
            res.end(JSON.stringify({ error: "Session has been revoked" }));
            return;
          }
        }

        const dbUser = await prisma.user.findUnique({
          where: { id: payload.userId },
          select: { id: true, role: true, isSuspended: true }
        });
        if (!dbUser || dbUser.isSuspended) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "Forbidden" }));
          return;
        }

        if (normalizedPathname === "/api/admin/secure-media/upload-raw" && !["ADMIN", "SUPER_ADMIN"].includes(dbUser.role)) {
          res.statusCode = 403;
          res.end(JSON.stringify({ error: "Forbidden: Admin access required" }));
          return;
        }

        // Pre-validate original filename before writing any chunk to disk
        const rawNameBase64 = (req.headers["x-upload-original-name"] as string) || "";
        let rawName = "";
        try {
          rawName = decodeURIComponent(Buffer.from(rawNameBase64, "base64").toString());
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "Nama file tidak valid." }));
          return;
        }
        const extCheck = hasForbiddenExtension(rawName);
        if (extCheck.forbidden) {
          res.statusCode = 415;
          res.end(JSON.stringify({ error: extCheck.reason || "File berbahaya diblokir." }));
          return;
        }

        // Chunking support: allow clients to upload in 40MB slices to bypass Cloudflare 100MB body limit
        const clientToken = (req.headers["x-upload-token"] as string) || "";
        const chunkIndex = parseInt((req.headers["x-upload-chunk-index"] as string) || "0", 10);
        const totalChunks = parseInt((req.headers["x-upload-total-chunks"] as string) || "1", 10);

        const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        const uploadToken = (clientToken && UUID_REGEX.test(clientToken)) ? clientToken : crypto.randomUUID();
        const tempPath = path.join(process.cwd(), "storage", "upload-buffers", uploadToken);

        await fs.promises.mkdir(path.dirname(tempPath), { recursive: true });

        let existingSize = 0;
        if (chunkIndex > 0) {
          try {
            const st = await fs.promises.stat(tempPath);
            existingSize = st.size;
          } catch {}
        }

        const ws = fs.createWriteStream(tempPath, { flags: chunkIndex > 0 ? "a" : "w", mode: 0o600 });

        // Limit upload size to 10GB for authenticated users/admins
        const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024;
        let uploadedBytes = 0;
        let isAborted = false;

        req.on('data', (chunk) => {
          uploadedBytes += chunk.length;
          if (existingSize + uploadedBytes > MAX_FILE_SIZE) {
            isAborted = true;
            req.destroy();
            ws.destroy();
            fs.unlink(tempPath, () => { });
            if (!res.headersSent) {
              res.statusCode = 413;
              res.end(JSON.stringify({ error: "Payload Too Large (Max 10GB)" }));
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
          fs.unlink(tempPath, () => {});
          if (!res.headersSent) {
            res.statusCode = 500;
            res.end(JSON.stringify({ error: "Upload failed" }));
          }
          return;
        }

        // If this is an intermediate chunk, respond 200 immediately
        if (chunkIndex < totalChunks - 1) {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, uploadToken, chunkIndex, totalChunks }));
          return;
        }

        // Final chunk assembled! Forward to Next.js targetPath
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
          proxyRes.on("end", () => {
            // Ensure temp buffer is always cleaned up after final processing
            fs.unlink(tempPath, () => {});
          });
        });

        proxyReq.on("error", (err: any) => {
          fs.unlink(tempPath, () => {});
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

    // ⚡ Pre-warm public caches & ensure resume DB records are populated in background
    import("./lib/resume-data-sync").then(({ ensureResumeDataSyncedToDb }) => {
      ensureResumeDataSyncedToDb().catch(() => {});
    }).catch(() => {});

    import("./lib/cache").then(({ warmupPublicCache }) => {
      warmupPublicCache().catch((err) => {
        console.warn('> [Cache Warmup] Background warmup note:', err?.message || err);
      });
    }).catch((err) => {
      console.warn('> [Cache Warmup] Failed to load cache module:', err?.message || err);
    });

    // ⚡ Standardize legacy PAYG invoice numbers in background
    import("./lib/invoice-standardizer").then(({ normalizeAllLegacyInvoices }) => {
      normalizeAllLegacyInvoices().catch((err) => {
        console.warn('> [Invoice Standardizer] Background migration note:', err?.message || err);
      });
    }).catch((err) => {
      console.warn('> [Invoice Standardizer] Failed to load module:', err?.message || err);
    });

    // 🛡️ Auto-recover any VPS reinstalls or background jobs interrupted by previous container restart / deployment
    import("./lib/stale-service-recovery").then(({ recoverStaleReinstalls }) => {
      recoverStaleReinstalls().then((count) => {
        if (count > 0) {
          console.log(`> [Reinstall Recovery] Safely recovered ${count} stuck provisioning VM(s) after restart`);
        }
      }).catch((err) => {
        console.warn('> [Reinstall Recovery] Startup check note:', err?.message || err);
      });
    }).catch(() => {});

    import("./lib/job-queue").then(({ JobQueueService }) => {
      JobQueueService.recoverStaleJobs(5).then((count) => {
        if (count > 0) {
          console.log(`> [Job Queue Recovery] Safely recovered ${count} stuck background job(s) after restart`);
        }
      }).catch((err) => {
        console.warn('> [Job Queue Recovery] Startup check note:', err?.message || err);
      });
    }).catch(() => {});

    // RustFS Zero-Downtime Background Local Assets Migration Check
    setTimeout(() => {
      import("./lib/rustfs").then(async ({ getRustFSConfig, migrateAllLocalAssetsToRustFS }) => {
        try {
          const config = await getRustFSConfig();
          if (config.enabled) {
            const res = await migrateAllLocalAssetsToRustFS({ deleteLocalAfterUpload: true, silentIfEmpty: true });
            if (res.totalMigrated > 0) {
              console.log(`> [RustFS Auto-Sync] Successfully migrated ${res.totalMigrated} production asset(s) to buckets.`);
            }
          }
        } catch (err: any) {
          console.warn('> [RustFS Auto-Sync] Startup check note:', err?.message || err);
        }
      }).catch(() => {});
    }, 10000);
  });

  // ========================================
  // CRON JOBS SETUP
  // ========================================
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    console.warn("> [CRON] WARNING: CRON_SECRET is not set. Internal HTTP cron triggers will be skipped until CRON_SECRET is configured.");
  }

  // Sweep orphaned upload buffers older than 1 hour every 15 minutes to prevent disk exhaustion
  cron.schedule('*/15 * * * *', async () => {
    try {
      const fsPromises = await import("fs/promises");
      const bufferDir = path.join(process.cwd(), "storage", "upload-buffers");
      const entries = await fsPromises.readdir(bufferDir).catch(() => []);
      const cutoff = Date.now() - 60 * 60 * 1000;
      for (const name of entries) {
        const fullPath = path.join(bufferDir, name);
        const st = await fsPromises.stat(fullPath).catch(() => null);
        if (st && st.isFile() && st.mtimeMs < cutoff) {
          await fsPromises.unlink(fullPath).catch(() => {});
        }
      }
    } catch {}
  });

  const setupCronJob = (schedule: string, endpoint: string) => {
    cron.schedule(schedule, async () => {
      if (!cronSecret) return;
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
