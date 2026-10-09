import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateReseller, apiError } from "@/lib/reseller-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const auth = await authenticateReseller(req, { name: "RESELLER_API_IMAGES", max: 60, windowSec: 60 });
    if (auth.error) return auth.error;

    const templates = await prisma.vpsTemplate.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, osType: true, image: true },
    });

    // Template names follow the "<family>-<version>" convention, e.g. "ubuntu-22.04"
    const images = templates.map((tpl) => {
      const parts = tpl.name.split("-");
      return {
        id: tpl.id,
        slug: tpl.name, // pass this value as `os` when creating / reinstalling a VM
        name: tpl.name,
        family: parts[0],
        version: parts.slice(1).join("-") || "latest",
        osType: tpl.osType,
      };
    });

    return NextResponse.json({ success: true, data: images });
  } catch (error: any) {
    console.error("[RESELLER_API_IMAGES]", error);
    return apiError("Internal server error", 500);
  }
}
