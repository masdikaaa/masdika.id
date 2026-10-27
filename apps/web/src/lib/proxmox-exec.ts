import WebSocket from "ws";
import { prisma } from "@/lib/prisma";

export interface ProxmoxExecResult {
  stdout: string;
  exitCode: number;
}

/**
 * Executes a shell command directly on the Proxmox VE hypervisor host via termproxy WebSocket.
 * This runs with root privileges and allows running commands such as vzdump, curl, qm, etc.
 */
export async function executeProxmoxHostCommand(
  cmd: string,
  options?: {
    timeoutMs?: number;
    node?: string;
  }
): Promise<ProxmoxExecResult> {
  const timeoutMs = options?.timeoutMs || 10 * 60 * 1000; // 10 minutes default
  const node = options?.node || "proxmox";

  const server = await prisma.proxmoxServer.findFirst({ where: { isActive: true } });
  if (!server) throw new Error("No active Proxmox server configured");

  const baseUrl = server.host.replace(/\/$/, "");
  const hostname = new URL(server.host).hostname;

  // Request termproxy session on the target node
  const res = await fetch(`${baseUrl}/api2/json/nodes/${node}/termproxy`, {
    method: "POST",
    headers: {
      Authorization: `PVEAPIToken=${server.tokenId}=${server.tokenSecret}`,
    }
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to create Proxmox termproxy session (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const { port, ticket, user } = json.data;

  return new Promise((resolve, reject) => {
    const ws = new WebSocket(
      `wss://${hostname}:8006/api2/json/nodes/${node}/vncwebsocket?port=${port}&vncticket=${encodeURIComponent(ticket)}`,
      {
        rejectUnauthorized: false,
        headers: {
          Authorization: `PVEAPIToken=${server.tokenId}=${server.tokenSecret}`,
          Cookie: "PVEAuthCookie="
        }
      }
    );

    let output = "";
    let loggedIn = false;
    let commandSent = false;
    const marker = `__CMD_DONE_${Date.now()}_${Math.random().toString(36).substring(2, 7)}__`;

    const timer = setTimeout(() => {
      try { ws.close(); } catch {}
      reject(new Error(`Proxmox command execution timed out after ${timeoutMs}ms. Output: ${output.slice(-1000)}`));
    }, timeoutMs);

    const sendPvePacket = (text: string) => {
      const payload = `${text}\n`;
      ws.send(`0:${payload.length}:${payload}`);
    };

    ws.on("open", () => {
      ws.send(`${user}:${ticket}\n`);
    });

    ws.on("message", (raw: any) => {
      const chunk = raw.toString();
      output += chunk;

      if (!loggedIn) {
        if (chunk.includes("login:")) {
          sendPvePacket("root");
        } else if (chunk.includes("Password:")) {
          sendPvePacket(server.password || "");
        } else if (chunk.includes("root@") || chunk.includes("# ")) {
          loggedIn = true;
          commandSent = true;
          // Send command wrapped with exit code marker
          sendPvePacket(`${cmd}; echo "${marker}:$?"`);
        }
      } else if (commandSent) {
        // Occurrence >= 2 accounts for terminal echo vs bash execution output
        const occurrences = (output.match(new RegExp(marker, "g")) || []).length;
        if (occurrences >= 2) {
          clearTimeout(timer);
          try { ws.close(); } catch {}

          const match = output.match(new RegExp(`${marker}:(\\d+)`));
          const exitCode = match ? parseInt(match[1], 10) : 0;
          resolve({ stdout: output, exitCode });
        }
      }
    });

    ws.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });

    ws.on("close", () => {
      clearTimeout(timer);
      if (commandSent) {
        const match = output.match(new RegExp(`${marker}:(\\d+)`));
        const exitCode = match ? parseInt(match[1], 10) : 0;
        resolve({ stdout: output, exitCode });
      }
    });
  });
}
