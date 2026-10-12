import { loadEnvConfig } from "@next/env";
import path from "path";
import http from "http";
import { handleVncUpgrade } from "../src/lib/vnc-proxy-handler";

// Load environment variables if running in monorepo root or local
const projectRoot = path.resolve(process.cwd(), "../../");
try {
  loadEnvConfig(projectRoot);
} catch {
  // Ignore error if running in standalone docker container where env vars are injected
}

const port = Number(process.env.PORT || process.env.VNC_PROXY_PORT || 3001);
const hostname = process.env.HOSTNAME || "0.0.0.0";

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  if (reqUrl.pathname === "/health" || reqUrl.pathname === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", service: "masdika-vnc-proxy", uptime: process.uptime() }));
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not Found", message: "VNC Proxy handles WebSocket connections on /api/ws/vnc" }));
});

server.on("upgrade", (req: any, socket: any, head: any) => {
  const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost"}`);
  const normalizedPathname = reqUrl.pathname.replace(/\/+/g, '/');

  if (normalizedPathname === "/api/ws/vnc" || normalizedPathname.startsWith("/api/ws/")) {
    handleVncUpgrade(req, socket, head);
  } else {
    socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
    socket.destroy();
  }
});

server.listen(port, hostname, () => {
  console.log(`> [VNC PROXY] Dedicated WebSocket proxy running on http://${hostname}:${port}`);
  console.log(`> Ready for VNC connections on ws://${hostname}:${port}/api/ws/vnc`);
});
