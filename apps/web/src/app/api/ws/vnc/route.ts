import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  console.error("=========================================================================");
  console.error("🚨 CRITICAL ERROR: VNC WebSocket request received as a normal HTTP GET! 🚨");
  console.error("This means the reverse proxy (Nginx/Cloudflare) STRIPPED the 'Upgrade' header.");
  console.error("VNC cannot connect because the proxy is blocking WebSocket connections.");
  console.error("=========================================================================");

  return NextResponse.json(
    { 
      error: "WebSocket connection blocked by reverse proxy. Please check your Nginx or Cloudflare configuration to allow WebSocket upgrades." 
    },
    { status: 400 }
  );
}
