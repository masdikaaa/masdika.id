import { NextResponse } from "next/server";
import crypto from "crypto";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request, props: { params: Promise<{ id: string }> }) {
  try {
    const params = await props.params;
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;
    const tunnelId = params.id;

    if (!tunnelId) {
      return NextResponse.json({ error: "Tunnel ID is required" }, { status: 400 });
    }

    const cfToken = process.env.CLOUDFLARE_API_TOKEN;
    const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;

    if (!cfToken || !cfAccountId) {
      return NextResponse.json({ error: "Cloudflare credentials are not configured in .env" }, { status: 500 });
    }

    // Verify tunnel belongs to user
    const dbTunnel = await prisma.cloudflareTunnel.findFirst({
      where: {
        cfTunnelId: tunnelId,
        userId: Number(user.id)
      }
    });

    if (!dbTunnel) {
      return NextResponse.json({ error: "Tunnel not found or unauthorized" }, { status: 404 });
    }

    // To refresh/rotate the token, we generate a new secret and PATCH it to the Cloudflare API
    const newSecret = crypto.randomBytes(32).toString('base64');

    const res = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${tunnelId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${cfToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tunnel_secret: newSecret
      })
    });

    const data = await res.json();

    if (!data.success) {
      console.error("Cloudflare API Error (Rotate Token):", data.errors);
      return NextResponse.json({ error: data.errors?.[0]?.message || "Failed to rotate token in Cloudflare" }, { status: 400 });
    }

    // Now that the secret is updated, let's fetch the official token string straight from Cloudflare 
    // to ensure 100% authenticity ("asli sesuai di cloudflare nya")
    const getRes = await fetch(`https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/cfd_tunnel/${tunnelId}/token`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${cfToken}`,
        'Content-Type': 'application/json'
      }
    });

    const getData = await getRes.json();
    
    if (!getData.success) {
      // Fallback: Manually construct the token if GET fails for some reason
      const tokenObj = {
        a: cfAccountId,
        t: tunnelId,
        s: newSecret
      };
      const tokenStr = Buffer.from(JSON.stringify(tokenObj)).toString('base64');
      return NextResponse.json({ success: true, token: tokenStr });
    }

    // Return the genuine new token from Cloudflare
    return NextResponse.json({ 
      success: true, 
      token: getData.result 
    });
  } catch (error: any) {
    console.error("Failed to refresh tunnel token:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
