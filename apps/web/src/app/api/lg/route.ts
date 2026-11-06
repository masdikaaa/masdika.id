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

    // SSRF / Network Isolation Protection: Block private, loopback, or internal addresses
    let resolvedIp = cleanHost;
    if (!net.isIP(cleanHost)) {
      try {
        const lookupResult = await dns.promises.lookup(cleanHost);
        resolvedIp = lookupResult.address;
      } catch {
        return new Response("Unable to resolve destination hostname\n", { status: 400 });
      }
    }

    if (isPrivateIp(resolvedIp)) {
      return new Response("Forbidden: Probing private, loopback, or internal networks is not permitted.\n", { status: 403 });
    }

    let command = "";
    let args: string[] = [];

    const isWin = os.platform() === "win32";

    switch (type) {
      case "ping":
        command = "ping";
        args = isWin ? ["-n", "4", cleanHost] : ["-c", "4", "--", cleanHost];
        break;
      case "traceroute":
        command = isWin ? "tracert" : "traceroute";
        args = isWin ? ["-d", "-h", "15", cleanHost] : ["-m", "15", "-n", "--", cleanHost];
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
        args = ["-r", "-w", "-c", "4", "--", cleanHost];
        break;
      default:
        return new Response("Invalid test type\n", { status: 400 });
    }

    // Create a ReadableStream to stream the stdout/stderr in real-time
    const stream = new ReadableStream({
      start(controller) {
        const child = spawn(command, args);

        // Security watchdog: Terminate child process after 15 seconds to prevent hanging
        const timeout = setTimeout(() => {
          try {
            child.kill("SIGKILL");
            controller.enqueue(new TextEncoder().encode("\n[Execution Timeout: Process terminated after 15 seconds]\n"));
            controller.close();
          } catch {}
        }, 15000);

        child.stdout.on("data", (data) => {
          controller.enqueue(data);
        });

        child.stderr.on("data", (data) => {
          controller.enqueue(data);
        });

        child.on("close", (code) => {
          clearTimeout(timeout);
          controller.enqueue(new TextEncoder().encode(`\n[Process completed with code ${code}]\n`));
          controller.close();
        });

        child.on("error", (err) => {
          clearTimeout(timeout);
          controller.enqueue(new TextEncoder().encode(`\n[Execution Error]: ${err.message}\n`));
          controller.close();
        });
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
