import { NextRequest } from "next/server";
import { spawn } from "child_process";
import os from "os";

// Validate IP or Hostname to prevent command injection
const isValidHost = (host: string) => {
  const ipRegex = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
  const domainRegex = /^([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
  // Also allow 'localhost' or simple hostnames
  const simpleHostRegex = /^[a-zA-Z0-9-]+$/;
  return ipRegex.test(host) || domainRegex.test(host) || simpleHostRegex.test(host);
};

export async function POST(req: NextRequest) {
  try {
    const { type, host } = await req.json();

    if (!host || !type) {
      return new Response("Missing parameters", { status: 400 });
    }

    if (!isValidHost(host)) {
      return new Response("Invalid hostname or IP address\n", { status: 400 });
    }

    let command = "";
    let args: string[] = [];

    const isWin = os.platform() === "win32";

    switch (type) {
      case "ping":
        command = "ping";
        args = isWin ? ["-n", "4", host] : ["-c", "4", host];
        break;
      case "traceroute":
        command = isWin ? "tracert" : "traceroute";
        args = isWin ? ["-d", "-h", "15", host] : ["-m", "15", "-n", host];
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
        args = ["-r", "-w", "-c", "4", host];
        break;
      default:
        return new Response("Invalid test type", { status: 400 });
    }

    // Create a ReadableStream to stream the stdout/stderr in real-time
    const stream = new ReadableStream({
      start(controller) {
        const child = spawn(command, args);

        child.stdout.on("data", (data) => {
          controller.enqueue(data);
        });

        child.stderr.on("data", (data) => {
          controller.enqueue(data);
        });

        child.on("close", (code) => {
          controller.enqueue(new TextEncoder().encode(`\n[Process completed with code ${code}]\n`));
          controller.close();
        });

        child.on("error", (err) => {
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
    return new Response("Internal Server Error", { status: 500 });
  }
}
