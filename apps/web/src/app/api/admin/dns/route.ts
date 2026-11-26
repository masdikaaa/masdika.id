import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { decryptDeterministic } from "@/lib/encryption";
import { getPdnsPublicInfo, getPdnsZone } from "@/lib/powerdns";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const [zones, dnsInfo] = await Promise.all([
      prisma.dnsZone.findMany({
        include: {
          user: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      getPdnsPublicInfo(),
    ]);

    const enriched = await Promise.all(
      zones.map(async (z) => {
        let recordCount = 0;
        let dnssecEnabled = false;
        if (dnsInfo.configured) {
          try {
            const pdnsZone = await getPdnsZone(z.domain);
            recordCount = (pdnsZone.rrsets || []).filter((r) => r.type !== "SOA").length;
            dnssecEnabled = Boolean(pdnsZone.dnssec);
          } catch {}
        }

        let parsedNs: string[] = dnsInfo.nameservers;
        try {
          const raw = JSON.parse(z.nameservers || "[]");
          if (Array.isArray(raw) && raw.length > 0) parsedNs = raw;
        } catch {}

        return {
          id: z.id,
          zoneId: z.zoneId,
          domain: z.domain,
          status: z.status,
          nameservers: parsedNs,
          recordCount,
          dnssecEnabled,
          createdAt: z.createdAt.toISOString(),
          user: z.user
            ? {
                id: z.user.id,
                name: z.user.name ? decryptDeterministic(z.user.name) : "User",
                email: z.user.email ? decryptDeterministic(z.user.email) : "",
              }
            : null,
        };
      })
    );

    return NextResponse.json({
      success: true,
      zones: enriched,
      dnsInfo,
    });
  } catch (error) {
    console.error("Admin DNS list error:", error);
    return NextResponse.json(
      { error: "Failed to load DNS zones" },
      { status: 500 }
    );
  }
}
