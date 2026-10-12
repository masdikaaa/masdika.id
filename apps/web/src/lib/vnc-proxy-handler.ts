import httpProxy from "http-proxy";
import { consumeVncSession } from "./vnc-session";
import { verifySessionToken } from "./session";

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
  secure: false, // rejectUnauthorized: false equivalent
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
    
    // ── Auth & session validation ───────────────────────────────────────────
    const cookieHeader = req.headers.cookie || "";
    const cookies = parseCookie(cookieHeader);
    const sessionToken = cookies["admin_session"];

    const vncSessionId = cookies["VNC_SESSION_TOKEN"] || reqUrl.searchParams.get("session");
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

    // Verify session token if present; if from browser, ensure token belongs to the same user
    if (sessionToken) {
      const userId = verifySessionToken(sessionToken);
      if (!userId || vncSession.userId !== userId) {
        socket.write("HTTP/1.1 403 Forbidden\r\n\r\n");
        socket.destroy();
        return;
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

    console.log(`[VNC] Upgrading via http-proxy VMID:${vmid}...`);

    // Rewrite URL to target Proxmox endpoint
    req.url = `/api2/json/nodes/${node}/qemu/${vmid}/vncwebsocket?port=${vncPort}&vncticket=${encodeURIComponent(ticket)}`;
    
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
