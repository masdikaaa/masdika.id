import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  checkNsDelegation,
  deletePdnsZone,
  formatDisplayRecordName,
  getPdnsDnssecInfo,
  getPdnsZone,
  patchPdnsZoneRrsets,
  setPdnsDnssec,
  SUPPORTED_RECORD_TYPES,
  SupportedRecordType,
  toRecordFqdn,
  validateAndFormatRecordContent,
} from "@/lib/powerdns";

export const dynamic = "force-dynamic";

function parseZoneId(raw: string): number | null {
  const num = Number(raw);
  return Number.isInteger(num) && num > 0 ? num : null;
}

// GET: Fetch live PowerDNS records & delegation check for a specific user zone
export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN", "USER"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    const user = auth.user!;
    const { id } = await context.params;
    const zoneId = parseZoneId(id);
    if (!zoneId) {
      return NextResponse.json({ error: "Invalid zone ID" }, { status: 400 });
    }

    const zone = await prisma.dnsZone.findFirst({
      where: { id: zoneId, userId: Number(user.id) },
    });
    if (!zone) {
      return NextResponse.json({ error: "DNS zone not found" }, { status: 404 });
    }

    const [pdnsZone, nsCheck] = await Promise.all([
      getPdnsZone(zone.domain),
      checkNsDelegation(zone.domain),
    ]);

    const dnssec = await getPdnsDnssecInfo(zone.domain, Boolean(pdnsZone.dnssec)).catch(
      () => ({ enabled: Boolean(pdnsZone.dnssec), dsRecords: [] })
    );

    const newStatus = nsCheck.delegated ? "active" : "pending";
    if (newStatus !== zone.status) {
      await prisma.dnsZone.update({
        where: { id: zone.id },
        data: { status: newStatus },
      });
    }

    const records = (pdnsZone.rrsets || [])
      .filter(
        (rr) =>
          rr.type !== "SOA" &&
          !(rr.type === "NS" && rr.name.toLowerCase() === `${zone.domain}.`)
      )
      .map((rr) => ({
        fqdn: rr.name,
        name: formatDisplayRecordName(rr.name, zone.domain),
        type: rr.type,
        ttl: rr.ttl,
        records: rr.records || [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name) || a.type.localeCompare(b.type));

    return NextResponse.json({
      zone: {
        id: zone.id,
        domain: zone.domain,
        status: newStatus,
        detectedNs: nsCheck.detectedNs,
        serial: pdnsZone.serial,
      },
      dnssec,
      records,
    });
  } catch (error: any) {
    console.error("Failed to fetch DNS records:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch DNS records" },
      { status: 500 }
    );
  }
}

// PATCH: Create, replace, or delete a DNS record set in PowerDNS
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN", "USER"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.impersonatedBy) {
      return NextResponse.json(
        { error: "Cannot modify DNS records while impersonating a user" },
        { status: 403 }
      );
    }
    const user = auth.user!;

    const allowed = await checkRateLimit("DNS_RECORD_EDIT", String(user.id), 60, 300);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many DNS updates. Please slow down." },
        { status: 429 }
      );
    }

    const { id } = await context.params;
    const zoneId = parseZoneId(id);
    if (!zoneId) {
      return NextResponse.json({ error: "Invalid zone ID" }, { status: 400 });
    }

    const zone = await prisma.dnsZone.findFirst({
      where: { id: zoneId, userId: Number(user.id) },
    });
    if (!zone) {
      return NextResponse.json({ error: "DNS zone not found" }, { status: 404 });
    }

    const body = await req.json();
    if (body?.action === "toggle_dnssec") {
      const enabled = Boolean(body?.enabled);
      const dnssec = await setPdnsDnssec(zone.domain, enabled);
      return NextResponse.json({ success: true, dnssec });
    }

    const action = body?.action === "delete" ? "delete" : "upsert";
    const rawType = typeof body?.type === "string" ? body.type.trim().toUpperCase() : "";
    const rawName = typeof body?.name === "string" ? body.name : "@";

    if (!SUPPORTED_RECORD_TYPES.includes(rawType as SupportedRecordType)) {
      return NextResponse.json(
        { error: `Unsupported record type: ${rawType}` },
        { status: 400 }
      );
    }
    const recordType = rawType as SupportedRecordType;
    const fqdn = toRecordFqdn(rawName, zone.domain);

    // Protect root NS record from accidental deletion
    if (action === "delete" && recordType === "NS" && fqdn === `${zone.domain}.`) {
      return NextResponse.json(
        { error: "Root NS record cannot be deleted" },
        { status: 400 }
      );
    }

    if (action === "delete") {
      await patchPdnsZoneRrsets(zone.domain, [
        {
          name: fqdn,
          type: recordType,
          ttl: 300,
          changetype: "DELETE",
          records: [],
        },
      ]);
      return NextResponse.json({ success: true });
    }

    const ttlNum = Number(body?.ttl ?? 300);
    const ttl = Number.isFinite(ttlNum) ? Math.max(60, Math.min(86400, Math.round(ttlNum))) : 300;
    const rawRecords = Array.isArray(body?.records)
      ? body.records
      : [{ content: body?.content, priority: body?.priority, disabled: body?.disabled }];

    if (rawRecords.length === 0 || rawRecords.length > 50) {
      return NextResponse.json(
        { error: "Records count must be between 1 and 50" },
        { status: 400 }
      );
    }

    // RFC: CNAME cannot coexist with root apex (@) or other record types on the same name
    if (recordType === "CNAME" && fqdn === `${zone.domain}.`) {
      return NextResponse.json(
        { error: "CNAME cannot be set on the root domain (@). Use an A or AAAA record instead." },
        { status: 400 }
      );
    }

    const formattedRecords = rawRecords.map((item: any) => ({
      content: validateAndFormatRecordContent(
        recordType,
        String(item?.content ?? ""),
        item?.priority !== undefined ? Number(item.priority) : undefined
      ),
      disabled: Boolean(item?.disabled),
    }));

    const rrsetsToPatch: any[] = [
      {
        name: fqdn,
        type: recordType,
        ttl,
        changetype: "REPLACE",
        records: formattedRecords,
      },
    ];

    // If renaming an existing record (e.g. changing name or type during edit), remove the old RRset safely
    if (body?.previousName && body?.previousType) {
      const prevFqdn = toRecordFqdn(String(body.previousName), zone.domain);
      const prevType = String(body.previousType).trim().toUpperCase();
      if (prevFqdn !== fqdn || prevType !== recordType) {
        if (prevType === "SOA" || (prevType === "NS" && prevFqdn === `${zone.domain}.`)) {
          return NextResponse.json(
            { error: "Root SOA and NS records cannot be replaced with another record type" },
            { status: 400 }
          );
        }
        if (!SUPPORTED_RECORD_TYPES.includes(prevType as SupportedRecordType)) {
          return NextResponse.json(
            { error: `Unsupported previous record type: ${prevType}` },
            { status: 400 }
          );
        }
        rrsetsToPatch.unshift({
          name: prevFqdn,
          type: prevType,
          ttl: 300,
          changetype: "DELETE",
          records: [],
        });
      }
    }

    await patchPdnsZoneRrsets(zone.domain, rrsetsToPatch);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to update DNS record:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to update DNS record" },
      { status: 400 }
    );
  }
}

// DELETE: Remove a DNS zone from PowerDNS and database
export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireAuth({ allowedRoles: ["ADMIN", "USER"] });
    if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }
    if (auth.impersonatedBy) {
      return NextResponse.json(
        { error: "Cannot delete DNS zones while impersonating a user" },
        { status: 403 }
      );
    }
    const user = auth.user!;

    const { id } = await context.params;
    const zoneId = parseZoneId(id);
    if (!zoneId) {
      return NextResponse.json({ error: "Invalid zone ID" }, { status: 400 });
    }

    const zone = await prisma.dnsZone.findFirst({
      where: { id: zoneId, userId: Number(user.id) },
    });
    if (!zone) {
      return NextResponse.json({ error: "DNS zone not found" }, { status: 404 });
    }

    await deletePdnsZone(zone.domain);
    await prisma.dnsZone.delete({ where: { id: zone.id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Failed to delete DNS zone:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to delete DNS zone" },
      { status: 500 }
    );
  }
}
