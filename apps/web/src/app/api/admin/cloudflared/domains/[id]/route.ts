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
    const domainId = parseInt(id);

    if (isNaN(domainId)) {
      return NextResponse.json({ error: "Invalid domain ID" }, { status: 400 });
    }

    const dbDomain = await prisma.cloudflareDomain.findUnique({
      where: { id: domainId }
    });

    if (!dbDomain) {
      return NextResponse.json({ error: "Domain not found" }, { status: 404 });
    }

    const cfToken = process.env.CLOUDFLARE_API_TOKEN;

    if (cfToken) {
      try {
        await fetch(
          `https://api.cloudflare.com/client/v4/zones/${dbDomain.cfZoneId}`,
          {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${cfToken}`,
              'Content-Type': 'application/json'
            }
          }
        );
      } catch (e) {
        console.error("Failed to delete zone from Cloudflare, continuing with DB cleanup", e);
      }
    }

    await prisma.cloudflareDomain.delete({
      where: { id: dbDomain.id }
    });

    return NextResponse.json({ success: true, message: "Domain removed successfully" });
  } catch (error: any) {
    console.error("Failed to delete domain:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
