import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

const MAX_TUNNELS = 3;

export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const { name } = await req.json();

    if (!name) {
      return NextResponse.json({ error: "Tunnel name is required" }, { status: 400 });
    }

    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!cfToken || !cfAccountId) {
      return NextResponse.json({ error: "Cloudflare credentials are not configured in .env" }, { status: 500 });
    }

    // Verify user has an active VPS to prevent abuse
    const vpsCount = await prisma.vpsService.count({
      where: {
        userId: Number(user.id),
        status: { notIn: ["TERMINATED", "SUSPENDED", "PENDING"] }
      }
    });

    if (vpsCount === 0) {
      return NextResponse.json({ error: "Smart System: You must order and have an active VPS first to create a Cloudflare Tunnel." }, { status: 403 });
    }

    // Check per-user tunnel limit from database
    const userTunnelCount = await prisma.cloudflareTunnel.count({
      where: { userId: Number(user.id) }
    });

    if (userTunnelCount >= MAX_TUNNELS) {
      return NextResponse.json({ 
        error: `Maximum ${MAX_TUNNELS} tunnels allowed. Please delete an existing tunnel first.` 
      }, { status: 400 });
    }

    // Generate a 32-byte secret and encode to base64
    const tunnelSecret = crypto.randomBytes(32).toString('base64');

    // Call Cloudflare API to create the tunnel
    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        name, 
        tunnel_secret: tunnelSecret,
        config_src: "cloudflare"
      })
    });

    const data = await res.json();

    if (!data.success) {
      console.error("Cloudflare API Error (Create Tunnel):", data.errors);
      return NextResponse.json({ error: data.errors?.[0]?.message || "Failed to create tunnel in Cloudflare" }, { status: 400 });
    }

    const tunnelId = data.result.id;

    // Save tunnel ownership to database
    await prisma.cloudflareTunnel.create({
      data: {
        cfTunnelId: tunnelId,
        name,
        userId: Number(user.id),
      }
    });

    // Fetch the official token string straight from Cloudflare
    const getRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${tunnelId}/token`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cfToken}`,
        'Content-Type': 'application/json'
      }
    });

    const getData = await getRes.json();
    let tokenStr = "";

    if (getData.success) {
      tokenStr = getData.result;
    } else {
      // Fallback: Manually construct the token if GET fails
      const tokenObj = {
        a: cfAccountId,
        t: tunnelId,
        s: tunnelSecret
      };
      tokenStr = Buffer.from(JSON.stringify(tokenObj)).toString('base64');
    }

    return NextResponse.json({ 
      success: true, 
      tunnelId: tunnelId,
      token: tokenStr
    });
  } catch (error: any) {
    console.error("Failed to create tunnel:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
