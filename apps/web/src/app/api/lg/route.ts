import { NextRequest } from "next/server";
import { spawn } from "child_process";
import os from "os";
import dns from "dns";
import net from "net";
import { getClientIp } from "@/lib/get-ip";
import { checkRateLimit } from "@/lib/rate-limit";
import { isPrivateIp } from "@/lib/ssrf";

// Strict validation of IP or Hostname to prevent command/flag injection
const isValidHost = (host: string): boolean => {
  if (!host || host.length > 253) return false;
  // Disallow any leading or trailing dash, or internal dots/dashes repetition
  if (host.startsWith("-") || host.endsWith("-") || host.startsWith(".") || host.endsWith(".")) return false;

  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,63}$/;
  return ipv4Regex.test(host) || domainRegex.test(host);
};

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);

    // Rate Limit: 10 tests per minute per IP to prevent CPU/Process exhaustion
    const allowed = await checkRateLimit("LOOKING_GLASS", ip, 10, 60);
    if (!allowed) {
      return new Response("Too many looking glass requests. Please slow down.\n", { status: 429 });
    }

    const { type, host } = await req.json();

    if (!host || typeof host !== "string" || !type || typeof type !== "string") {
      return new Response("Missing parameters\n", { status: 400 });
    }

    const cleanHost = host.trim();

    if (!isValidHost(cleanHost)) {
      return new Response("Invalid hostname or IP address format\n", { status: 400 });
    }

    // SSRF / Network Isolation Protection: Resolve ALL records and block private, loopback, or internal addresses.
    // Pass the verified IP literal directly to ping/traceroute/mtr to prevent TOCTOU DNS rebinding.
    let resolvedIp = cleanHost;
    if (!net.isIP(cleanHost)) {
      try {
        const lookupResults = await dns.promises.lookup(cleanHost, { all: true });
        if (!lookupResults || lookupResults.length === 0) {
          return new Response("Unable to resolve destination hostname\n", { status: 400 });
        }
        if (lookupResults.some((entry) => isPrivateIp(entry.address))) {
          return new Response("Forbidden: Probing private, loopback, or internal networks is not permitted.\n", { status: 403 });
        }
        const preferred = lookupResults.find((entry) => entry.family === 4) || lookupResults[0];
        resolvedIp = preferred.address;
      } catch {
        return new Response("Unable to resolve destination hostname\n", { status: 400 });
      }
    } else if (isPrivateIp(resolvedIp)) {
      return new Response("Forbidden: Probing private, loopback, or internal networks is not permitted.\n", { status: 403 });
    }

    let command = "";
    let args: string[] = [];

    const isWin = os.platform() === "win32";

    switch (type) {
      case "ping":
        command = "ping";
        args = isWin ? ["-n", "4", resolvedIp] : ["-c", "4", "--", resolvedIp];
        break;
      case "traceroute":
        command = isWin ? "tracert" : "traceroute";
        args = isWin ? ["-d", "-h", "15", resolvedIp] : ["-m", "15", "-n", "--", resolvedIp];
        break;
      case "mtr":
        if (isWin) {
          // Return immediately with a simulated message for Windows dev
          const stream = new ReadableStream({
            start(controller) {
              controller.enqueue(
                new TextEncoder().encode(
                  "MTR is not natively supported on Windows local development.\n" +
                    "This feature will work normally on the Linux/Docker production server.\n\n" +
                    "Simulating MTR... completed.\n"
                )
              );
              controller.close();
            },
          });
          return new Response(stream, { headers: { "Content-Type": "text/plain" } });
        }
        command = "mtr";
        args = ["-r", "-w", "-n", "-c", "4", "--", resolvedIp];
        break;
      default:
        return new Response("Invalid test type\n", { status: 400 });
    }

    // Create a ReadableStream to stream the stdout/stderr in real-time
    let childProcess: ReturnType<typeof spawn> | null = null;
    const stream = new ReadableStream({
      start(controller) {
        let closed = false;
        const safeEnqueue = (chunk: Uint8Array) => {
          if (closed) return;
          try {
            controller.enqueue(chunk);
          } catch {
            closed = true;
          }
        };
        const safeClose = () => {
          if (closed) return;
          closed = true;
          try {
            controller.close();
          } catch {}
        };

        const child = spawn(command, args);
        childProcess = child;

        // Security watchdog: Terminate child process after 15 seconds to prevent hanging
        const timeout = setTimeout(() => {
          try {
            child.kill("SIGKILL");
            safeEnqueue(new TextEncoder().encode("\n[Execution Timeout: Process terminated after 15 seconds]\n"));
            safeClose();
          } catch {}
        }, 15000);

        child.stdout.on("data", (data) => {
          safeEnqueue(data);
        });

        child.stderr.on("data", (data) => {
          safeEnqueue(data);
        });

        child.on("close", (code) => {
          clearTimeout(timeout);
          safeEnqueue(new TextEncoder().encode(`\n[Process completed with code ${code}]\n`));
          safeClose();
        });

        child.on("error", (err) => {
          clearTimeout(timeout);
          safeEnqueue(new TextEncoder().encode(`\n[Execution Error]: ${err.message}\n`));
          safeClose();
        });
      },
      cancel() {
        try {
          childProcess?.kill("SIGKILL");
        } catch {}
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/plain",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    return new Response("Internal Server Error\n", { status: 500 });
  }
}
