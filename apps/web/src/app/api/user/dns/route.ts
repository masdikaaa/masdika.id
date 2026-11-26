import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  checkNsDelegation,
  createPdnsZone,
  deletePdnsZone,
  getPdnsPublicInfo,
  getPdnsZone,
  isReservedPlatformDomain,
  isValidDomain,
  normalizeDomain,
} from "@/lib/powerdns";

export const dynamic = "force-dynamic";

const MAX_DNS_ZONES = 20;

// GET: List customer's DNS zones with record count & live NS delegation status
export async function GET() {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN", "USER"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;

    const zones = await prisma.dnsZone.findMany({
      where: { userId: Number(user.id) },
      orderBy: { createdAt: "desc" },
    });

    const publicInfo = await getPdnsPublicInfo();

    const enriched = await Promise.all(
      zones.map(async (z) => {
        let recordCount = 0;
        let detectedNs: string[] = [];
        let status = z.status;

        try {
          const [pdnsZone, nsCheck] = await Promise.all([
            getPdnsZone(z.domain),
            checkNsDelegation(z.domain),
          ]);
          recordCount = (pdnsZone.rrsets || []).filter((r) => r.type !== "SOA").length;
          detectedNs = nsCheck.detectedNs;
          status = nsCheck.delegated ? "active" : "pending";

          if (status !== z.status) {
            await prisma.dnsZone.update({
              where: { id: z.id },
              data: { status },
            });
          }
        } catch {
          // Keep stored status if PowerDNS or DNS check temporarily fails
        }

        let parsedNs: string[] = publicInfo.nameservers;
        try {
          const raw = JSON.parse(z.nameservers || "[]");
          if (Array.isArray(raw) && raw.length > 0) parsedNs = raw;
        } catch {}

        return {
          id: z.id,
          zoneId: z.zoneId,
          domain: z.domain,
          nameservers: parsedNs,
          status,
          recordCount,
          detectedNs,
          createdAt: z.createdAt.toISOString(),
        };
      })
    );

    return NextResponse.json({
      zones: enriched,
      total: enriched.length,
      maxZones: MAX_DNS_ZONES,
      dnsInfo: publicInfo,
    });
  } catch (error: any) {
    console.error("Failed to list DNS zones:", error);
    return NextResponse.json(
      { error: "Failed to load DNS zones" },
      { status: 500 }
    );
  }
}

// POST: Create a new DNS zone in PowerDNS and assign ownership to user
export async function POST(req: Request) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN", "USER"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.impersonatedBy) {
      return NextResponse.json(
        { error: "Cannot create DNS zones while impersonating a user" },
        { status: 403 }
      );
    }
    const user = auth.user!;

    const allowed = await checkRateLimit("DNS_ZONE_ADD", String(user.id), 15, 3600);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many DNS zone requests. Please try again later." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const rawDomain = typeof body?.domain === "string" ? body.domain : "";
    const domain = normalizeDomain(rawDomain);

    if (!isValidDomain(domain)) {
      return NextResponse.json(
        { error: "Please enter a valid domain name (e.g. example.com)" },
        { status: 400 }
      );
    }

    if (await isReservedPlatformDomain(domain)) {
      return NextResponse.json(
        { error: "Platform, public-suffix, and system domains cannot be registered here" },
        { status: 403 }
      );
    }

    const existingCount = await prisma.dnsZone.count({
      where: { userId: Number(user.id) },
    });
    if (existingCount >= MAX_DNS_ZONES) {
      return NextResponse.json(
        { error: `Maximum limit of ${MAX_DNS_ZONES} DNS zones reached` },
        { status: 400 }
      );
    }

    const existingZone = await prisma.dnsZone.findUnique({
      where: { domain },
    });
    if (existingZone) {
      return NextResponse.json(
        { error: "This domain is already registered in Masdika DNS" },
        { status: 409 }
      );
    }

    // Prevent parent/child zone overlap across different users (subdomain hijack protection)
    const otherUserZones = await prisma.dnsZone.findMany({
      where: { userId: { not: Number(user.id) } },
      select: { domain: true },
    });
    const overlapping = otherUserZones.find(
      (z) =>
        domain.endsWith(`.${z.domain}`) || z.domain.endsWith(`.${domain}`)
    );
    if (overlapping) {
      return NextResponse.json(
        { error: "This domain overlaps with an existing managed zone" },
        { status: 409 }
      );
    }

    const pdnsZone = await createPdnsZone(domain);
    const publicInfo = await getPdnsPublicInfo();
    const nsCheck = await checkNsDelegation(domain);
    const initialStatus = nsCheck.delegated ? "active" : "pending";

    try {
      const created = await prisma.dnsZone.create({
        data: {
          zoneId: pdnsZone.id || `${domain}.`,
          domain,
          nameservers: JSON.stringify(publicInfo.nameservers),
          status: initialStatus,
          userId: Number(user.id),
        },
      });

      return NextResponse.json(
        {
          success: true,
          zone: {
            id: created.id,
            zoneId: created.zoneId,
            domain: created.domain,
            nameservers: publicInfo.nameservers,
            status: created.status,
            recordCount: 1,
            detectedNs: nsCheck.detectedNs,
            createdAt: created.createdAt.toISOString(),
          },
        },
        { status: 201 }
      );
    } catch (dbErr) {
      // Rollback PowerDNS zone if DB insert failed
      await deletePdnsZone(domain).catch(() => {});
      throw dbErr;
    }
  } catch (error: any) {
    console.error("Failed to create DNS zone:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create DNS zone" },
      { status: error?.status === 409 ? 409 : 500 }
    );
  }
}
