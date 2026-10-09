import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { id } = await params;
    const tunnelId = parseInt(id);

    if (isNaN(tunnelId)) {
      return NextResponse.json({ error: "Invalid tunnel ID" }, { status: 400 });
    }

    const dbTunnel = await prisma.cloudflareTunnel.findUnique({
      where: { id: tunnelId }
    });

    if (!dbTunnel) {
      return NextResponse.json({ error: "Tunnel not found" }, { status: 404 });
    }

    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfToken = process.env.CLOUDFLARE_API_TOKEN;

    if (accountId && cfToken) {
      try {
        await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${accountId}/cfd_tunnel/${dbTunnel.cfTunnelId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${cfToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (e) {
        console.error("Failed to delete tunnel from Cloudflare, continuing with DB cleanup", e);
      }
    }

    await prisma.cloudflareTunnel.delete({
      where: { id: dbTunnel.id }
    });

    return NextResponse.json({ success: true, message: "Tunnel removed successfully" });
  } catch (error: any) {
    console.error("Failed to delete tunnel:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
