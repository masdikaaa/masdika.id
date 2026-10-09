import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const { id } = await params;
    const domainId = parseInt(id);

    if (isNaN(domainId)) {
      return NextResponse.json({ error: "Invalid domain ID" }, { status: 400 });
    }

    // Verify ownership
    const dbDomain = await prisma.cloudflareDomain.findFirst({
      where: {
        id: domainId,
        userId: Number(user.id),
      }
    });

    if (!dbDomain) {
      return NextResponse.json({ error: "Domain not found or you don't have permission" }, { status: 403 });
    }

    const cfToken = process.env.CLOUDFLARE_API_TOKEN;

    if (!cfToken) {
      return NextResponse.json({ error: "Cloudflare credentials not configured" }, { status: 500 });
    }

    // 1. Force Cloudflare to re-check nameservers
    const checkRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${dbDomain.cfZoneId}/activation_check`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${cfToken}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    // It's normal if this returns an error if already active, or rate limited. 
    // We proceed to check the status anyway.

    // 2. Fetch the latest status
    const statusRes = await fetch(
      `https://api.cloudflare.com/client/v4/zones/${dbDomain.cfZoneId}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${cfToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    const statusData = await statusRes.json();

    if (statusData.success && statusData.result) {
      const liveStatus = statusData.result.status;
      
      if (liveStatus !== dbDomain.status) {
        await prisma.cloudflareDomain.update({
          where: { id: dbDomain.id },
          data: { status: liveStatus },
        });
      }

      return NextResponse.json({ 
        success: true, 
        status: liveStatus,
        message: liveStatus === "active" 
          ? "Domain is now active!" 
          : "Nameservers not resolved yet. Please wait."
      });
    }

    return NextResponse.json({ error: "Failed to check domain status" }, { status: 400 });

  } catch (error: any) {
    console.error("Failed to check domain:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
