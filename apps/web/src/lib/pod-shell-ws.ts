import { PassThrough } from "stream";
import { WebSocketServer, WebSocket } from "ws";
import * as k8s from "@kubernetes/client-node";
import { prisma } from "./prisma";
import { getSessionPayload, verifySessionToken } from "./session";
import { getAppPlatformK8sClients } from "./k8s-app-platform";
import { parseCookie } from "./vnc-proxy-handler";

const podShellWss = new WebSocketServer({ noServer: true });

function isAllowedOrigin(req: any): boolean {
  const originHeader = req.headers?.origin;
  if (!originHeader) return true;

  let originHost = "";
  try {
    originHost = new URL(originHeader).host.toLowerCase();
  } catch {
    return false;
  }
  const originDomain = originHost.split(":")[0];

  const allowedHosts = new Set<string>([
    "masdika.id",
    "www.masdika.id",
    "localhost",
    "127.0.0.1",
  ]);

  const reqHost = String(req.headers["x-forwarded-host"] || req.headers.host || "")
    .split(",")[0]
    .trim()
    .toLowerCase();
  if (reqHost) {
    allowedHosts.add(reqHost);
    allowedHosts.add(reqHost.split(":")[0]);
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    try {
      const appUrlHost = new URL(process.env.NEXT_PUBLIC_APP_URL).host.toLowerCase();
      allowedHosts.add(appUrlHost);
      allowedHosts.add(appUrlHost.split(":")[0]);
    } catch {}
  }
  if (process.env.APP_URL) {
    try {
      const appUrlHost = new URL(process.env.APP_URL).host.toLowerCase();
      allowedHosts.add(appUrlHost);
      allowedHosts.add(appUrlHost.split(":")[0]);
    } catch {}
  }

  return (
    allowedHosts.has(originHost) ||
    allowedHosts.has(originDomain) ||
    originDomain.endsWith(".masdika.id") ||
    originDomain.endsWith(".masdikacloud.my.id")
  );
}

/**
 * Upgrade handler for real-time interactive Kubernetes Pod PTY shell (/api/ws/app-platform/shell?appId=123)
 */
export async function handlePodShellUpgrade(req: any, socket: any, head: any): Promise<void> {
  try {
    if (!isAllowedOrigin(req)) {
      console.warn("[PodShell WS] Origin rejected:", req.headers?.origin, "host:", req.headers?.host);
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
    const appId = parseInt(reqUrl.searchParams.get("appId") || "", 10);
    if (isNaN(appId) || appId <= 0) {
      socket.write("HTTP/1.1 400 Bad Request\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const cookies = parseCookie(req.headers?.cookie || "");
    const candidateTokens = [cookies["user_session"], cookies["admin_session"]].filter(
      (t): t is string => Boolean(t)
    );
    const sessionToken = candidateTokens.find((t) => Boolean(verifySessionToken(t))) || "";
    const payload = sessionToken ? getSessionPayload(sessionToken) : null;
    if (!payload?.userId) {
      console.warn("[PodShell WS] Unauthorized: missing or invalid session cookie");
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    if (payload.sessionId) {
      const sessionLog = await prisma.loginLog.findFirst({
        where: { sessionId: payload.sessionId },
        select: { isRevoked: true },
      });
      if (sessionLog?.isRevoked) {
        socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
        socket.destroy();
        return;
      }
    }

    const dbUser = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, role: true, isSuspended: true },
    });
    if (!dbUser || dbUser.isSuspended) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    const app = await prisma.appPlatformService.findUnique({
      where: { id: appId },
    });
    if (!app || app.status === "TERMINATED") {
      socket.write("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    if (dbUser.role !== "ADMIN" && app.userId !== dbUser.id) {
      socket.write("HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }
    if (app.status !== "RUNNING") {
      socket.write("HTTP/1.1 409 Conflict\r\nConnection: close\r\n\r\n");
      socket.destroy();
      return;
    }

    podShellWss.handleUpgrade(req, socket, head, async (ws: WebSocket) => {
      const stdinStream = new PassThrough();
      const stdoutStream = new PassThrough();
      let k8sWs: any = null;
      let closed = false;

      const sendJson = (obj: Record<string, any>) => {
        if (!closed && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(obj));
        }
      };

      const cleanup = () => {
        if (closed) return;
        closed = true;
        try {
          stdinStream.end();
        } catch {}
        try {
          stdoutStream.destroy();
        } catch {}
        try {
          if (k8sWs && typeof k8sWs.close === "function") {
            k8sWs.close();
          }
        } catch {}
      };

      ws.on("close", cleanup);
      ws.on("error", cleanup);

      try {
        const { kc, coreApi } = await getAppPlatformK8sClients();
        const namespace = app.k8sNamespace || "app-platform";
        const podsRes: any = await (coreApi as any).listNamespacedPod({
          namespace,
          labelSelector: `app=${app.subdomain}`,
        });
        const pods = podsRes?.items || podsRes?.body?.items || [];
        const runningPod = pods.find((p: any) => p?.status?.phase === "Running") || pods[0];

        if (!runningPod?.metadata?.name) {
          sendJson({ type: "error", message: "No running container pod found." });
          ws.close();
          return;
        }

        const podName = runningPod.metadata.name;
        const containerName = runningPod.spec?.containers?.[0]?.name || "app";

        stdoutStream.on("data", (chunk: Buffer) => {
          sendJson({ type: "data", data: chunk.toString("utf8") });
        });

        ws.on("message", (raw: Buffer | string) => {
          try {
            const msg = JSON.parse(typeof raw === "string" ? raw : raw.toString("utf8"));
            if (msg?.type === "input" && typeof msg.data === "string") {
              stdinStream.write(msg.data);
            } else if (
              msg?.type === "resize" &&
              Number.isFinite(msg.cols) &&
              Number.isFinite(msg.rows) &&
              k8sWs?.readyState === 1
            ) {
              // Kubernetes Exec resize channel = 4
              const resizePayload = JSON.stringify({
                Width: Math.max(20, Math.min(400, Math.floor(msg.cols))),
                Height: Math.max(5, Math.min(200, Math.floor(msg.rows))),
              });
              k8sWs.send(Buffer.from("\x04" + resizePayload));
            }
          } catch {}
        });

        const exec = new k8s.Exec(kc);
        k8sWs = await exec.exec(
          namespace,
          podName,
          containerName,
          [
            "sh",
            "-c",
            "export TERM=xterm-256color; if command -v bash >/dev/null 2>&1; then exec bash -il; else exec sh -i; fi",
          ],
          stdoutStream,
          null,
          stdinStream,
          true,
          () => {
            sendJson({ type: "exit" });
            cleanup();
            if (ws.readyState === WebSocket.OPEN) ws.close();
          }
        );

        sendJson({ type: "ready", podName });
      } catch (err: any) {
        console.error("[PodShell WS] Error:", err);
        sendJson({ type: "error", message: err?.message || "Failed to attach terminal" });
        cleanup();
        if (ws.readyState === WebSocket.OPEN) ws.close();
      }
    });
  } catch (err) {
    console.error("[PodShell Upgrade] Error:", err);
    if (socket && !socket.destroyed) {
      socket.write("HTTP/1.1 500 Internal Server Error\r\nConnection: close\r\n\r\n");
      socket.destroy();
    }
  }
}
