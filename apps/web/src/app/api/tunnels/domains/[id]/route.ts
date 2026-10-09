import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";

export async function DELETE(
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

    if (cfToken) {
      // Delete zone from Cloudflare
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
      } catch {
        // Best effort - continue with DB cleanup even if CF delete fails
        console.error("Failed to delete zone from Cloudflare, continuing with DB cleanup");
      }
    }

    // Remove from database
    await prisma.cloudflareDomain.delete({
      where: { id: dbDomain.id }
    });

    return NextResponse.json({ success: true, message: "Domain removed successfully" });
  } catch (error: any) {
    console.error("Failed to delete domain:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
