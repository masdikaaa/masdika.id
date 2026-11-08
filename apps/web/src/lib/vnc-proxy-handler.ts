import httpProxy from "http-proxy";
import { consumeVncSession } from "./vnc-session";
import { verifySessionToken, getSessionPayload } from "./session";

export const parseCookie = (str: string): Record<string, string> => {
  if (!str) return {};
  return str.split(";").reduce((acc, v) => {
    const [key, val] = v.split("=");
    if (key && val !== undefined) acc[decodeURIComponent(key.trim())] = decodeURIComponent(val.trim());
    return acc;
  }, {} as Record<string, string>);
};

export const vncProxy = httpProxy.createProxyServer({
  ws: true,
  secure: false, // rejectUnauthorized: false equivalent for Proxmox self-signed certificates
  changeOrigin: true
});

vncProxy.on("error", (err: any, req: any, socket: any) => {
  console.error("[VNC] Proxy error:", err);
  if (socket && !socket.destroyed) {
    socket.write("HTTP/1.1 502 Bad Gateway\r\n\r\n");
    socket.destroy();
  }
});

export async function handleVncUpgrade(req: any, socket: any, head: any): Promise<void> {
  try {
    const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);

    // ── CSWSH Origin validation when Origin header is present ───────────────
    const originHeader = req.headers.origin;
    if (originHeader) {
      let originHost = "";
      try {
        originHost = new URL(originHeader).host.toLowerCase();
      } catch {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }
      const originDomain = originHost.split(":")[0];

      const allowedHosts = new Set<string>([
        "masdika.id",
        "www.masdika.id",
        "localhost",
        "127.0.0.1",
      ]);

      const reqHost = String(req.headers["x-forwarded-host"] || req.headers.host || "").split(",")[0].trim().toLowerCase();
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

      const isAllowed = allowedHosts.has(originHost) || allowedHosts.has(originDomain);
      if (!isAllowed) {
        console.warn(`[VNC] Origin rejected: ${originHost}. Allowed:`, Array.from(allowedHosts));
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
      }
    }

    // ── Auth & session validation ───────────────────────────────────────────
    const cookieHeader = req.headers.cookie || "";
    const cookies = parseCookie(cookieHeader);
    const sessionToken = cookies["admin_session"] || cookies["user_session"];

    const querySession = reqUrl.searchParams.get("session");
    const cookieSession = cookies["VNC_SESSION_TOKEN"];
    const vncSessionId = querySession || cookieSession;
    if (!vncSessionId) {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    const vncSession = consumeVncSession(vncSessionId);
    if (!vncSession) {
      socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
      socket.destroy();
      return;
    }

    // If an active session cookie is present, verify the user is either the owner or an admin
    if (sessionToken) {
      const authUserId = verifySessionToken(sessionToken);
      if (authUserId) {
        const payload = getSessionPayload(sessionToken);
        const isAdmin = payload?.role === "ADMIN" || payload?.role === "SUPER_ADMIN";
        if (!isAdmin && vncSession.userId !== authUserId) {
          socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
          socket.destroy();
          return;
        }
      }
    }

    const { proxmoxHost, node, vmid, port: vncPort, ticket, tokenId, tokenSecret } = vncSession;

    let proxmoxUrl: URL;
    try {
      proxmoxUrl = new URL(proxmoxHost);
    } catch {
      socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
      socket.destroy();
      return;
    }

    const wsHost = proxmoxUrl.hostname;
    const wsPort = proxmoxUrl.port || "8006";

    // Build API token auth header: PVEAPIToken=user@realm!tokenname=secret
    const apiTokenAuth = `PVEAPIToken=${tokenId}=${tokenSecret}`;

    console.log(`[VNC] Upgrading via http-proxy VMID:${vmid} port:${vncPort}...`);

    // Rewrite URL to target Proxmox endpoint (strictly encoded)
    req.url = `/api2/json/nodes/${encodeURIComponent(node)}/qemu/${Number(vmid)}/vncwebsocket?port=${Number(vncPort)}&vncticket=${encodeURIComponent(ticket)}`;
    
    // Proxmox expects authorization in headers
    req.headers["Authorization"] = apiTokenAuth;
    
    const targetUrl = `wss://${wsHost}:${wsPort}`;

    vncProxy.ws(req, socket, head, {
      target: targetUrl
    });
  } catch (err) {
    console.error("[VNC] Upgrade handling error:", err);
    if (socket && !socket.destroyed) {
      socket.write("HTTP/1.1 500 Internal Server Error\r\n\r\n");
      socket.destroy();
    }
  }
}
