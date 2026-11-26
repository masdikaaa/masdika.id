import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import {
  checkNsDelegation,
  deletePdnsZone,
  formatDisplayRecordName,
  getPdnsDnssecInfo,
  getPdnsZone,
} from "@/lib/powerdns";

export const dynamic = "force-dynamic";

function parseZoneId(raw: string): number | null {
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const zoneId = parseZoneId(id);
    if (!zoneId) {
      return NextResponse.json({ error: "Invalid zone ID" }, { status: 400 });
    }

    const zone = await prisma.dnsZone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      return NextResponse.json({ error: "DNS zone not found" }, { status: 404 });
    }

    const [pdnsZone, nsCheck] = await Promise.all([
      getPdnsZone(zone.domain),
      checkNsDelegation(zone.domain),
    ]);

    const newStatus = nsCheck.delegated ? "active" : "pending";
    if (newStatus !== zone.status) {
      await prisma.dnsZone.update({
        where: { id: zone.id },
        data: { status: newStatus },
      });
    }

    const dnssec = await getPdnsDnssecInfo(zone.domain, Boolean(pdnsZone.dnssec)).catch(
      () => ({ enabled: Boolean(pdnsZone.dnssec), dsRecords: [] })
    );

    const records = (pdnsZone.rrsets || [])
      .filter((rr) => rr.type !== "SOA")
      .map((rr) => ({
        fqdn: rr.name,
        name: formatDisplayRecordName(rr.name, zone.domain),
        type: rr.type,
        ttl: rr.ttl,
        records: rr.records || [],
      }))
      .sort((a, b) => {
        if (a.type === "NS" && b.type !== "NS") return -1;
        if (b.type === "NS" && a.type !== "NS") return 1;
        return a.name.localeCompare(b.name) || a.type.localeCompare(b.type);
      });

    return NextResponse.json({
      zone: {
        id: zone.id,
        domain: zone.domain,
        status: newStatus,
        detectedNs: nsCheck.detectedNs,
      },
      dnssec,
      records,
    });
  } catch (error: any) {
    console.error("Admin DNS detail error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to load zone records" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const { id } = await context.params;
    const zoneId = parseZoneId(id);
    if (!zoneId) {
      return NextResponse.json({ error: "Invalid zone ID" }, { status: 400 });
    }

    const zone = await prisma.dnsZone.findUnique({ where: { id: zoneId } });
    if (!zone) {
      return NextResponse.json({ error: "DNS zone not found" }, { status: 404 });
    }

    await deletePdnsZone(zone.domain);
    await prisma.dnsZone.delete({ where: { id: zone.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Admin DNS delete error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete DNS zone" },
      { status: 500 }
    );
  }
}
