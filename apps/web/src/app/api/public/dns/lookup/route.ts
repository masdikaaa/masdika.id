import dns from "node:dns";
import { NextRequest, NextResponse } from "next/server";
import { getPdnsPublicInfo } from "@/lib/powerdns";

export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["A", "AAAA", "MX", "TXT", "NS", "CNAME", "SOA"] as const);
type QueryType = "A" | "AAAA" | "MX" | "TXT" | "NS" | "CNAME" | "SOA";

const HOSTNAME_RE =
  /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

export async function GET(req: NextRequest) {
  const rawDomain = (req.nextUrl.searchParams.get("domain") || "")
    .trim()
    .toLowerCase()
    .replace(/\.+$/, "");
  const rawType = (req.nextUrl.searchParams.get("type") || "A").trim().toUpperCase();

  if (!rawDomain || rawDomain.length > 253 || !HOSTNAME_RE.test(rawDomain)) {
    return NextResponse.json({ error: "Please enter a valid domain name (e.g. masdika.id)." }, { status: 400 });
  }

  if (
    rawDomain.endsWith(".local") ||
    rawDomain.endsWith(".internal") ||
    rawDomain.endsWith(".localhost")
  ) {
    return NextResponse.json({ error: "Internal hostnames cannot be queried." }, { status: 400 });
  }

  const qType: QueryType = ALLOWED_TYPES.has(rawType as QueryType) ? (rawType as QueryType) : "A";
  const info = await getPdnsPublicInfo().catch(() => ({
    publicIp: "103.247.10.61",
    resolver: "dns1.masdika.id",
    nameservers: ["ns1.masdika.id", "ns2.masdika.id"],
    enabled: false,
    configured: false,
  }));

  const serverIp = info.publicIp || "103.247.10.61";
  const resolver = new dns.promises.Resolver();
  resolver.setServers([serverIp]);

  const startedAt = Date.now();
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("DNS lookup timed out")), 3000)
  );

  try {
    let rawAnswer: unknown;
    switch (qType) {
      case "A":
        rawAnswer = await Promise.race([resolver.resolve4(rawDomain, { ttl: true }), timeoutPromise]);
        break;
      case "AAAA":
        rawAnswer = await Promise.race([resolver.resolve6(rawDomain, { ttl: true }), timeoutPromise]);
        break;
      case "MX":
        rawAnswer = await Promise.race([resolver.resolveMx(rawDomain), timeoutPromise]);
        break;
      case "TXT":
        rawAnswer = await Promise.race([resolver.resolveTxt(rawDomain), timeoutPromise]);
        break;
      case "NS":
        rawAnswer = await Promise.race([resolver.resolveNs(rawDomain), timeoutPromise]);
        break;
      case "CNAME":
        rawAnswer = await Promise.race([resolver.resolveCname(rawDomain), timeoutPromise]);
        break;
      case "SOA":
        rawAnswer = await Promise.race([resolver.resolveSoa(rawDomain), timeoutPromise]);
        break;
    }

    const latencyMs = Math.max(1, Date.now() - startedAt);
    let records: { value: string; ttl?: number }[] = [];

    if (qType === "A" || qType === "AAAA") {
      records = (rawAnswer as { address: string; ttl: number }[]).map((r) => ({
        value: r.address,
        ttl: r.ttl,
      }));
    } else if (qType === "MX") {
      records = (rawAnswer as { exchange: string; priority: number }[]).map((r) => ({
        value: `${r.priority} ${r.exchange}`,
      }));
    } else if (qType === "TXT") {
      records = (rawAnswer as string[][]).map((chunks) => ({
        value: chunks.join(""),
      }));
    } else if (qType === "NS" || qType === "CNAME") {
      records = (rawAnswer as string[]).map((v) => ({ value: v }));
    } else if (qType === "SOA") {
      const s = rawAnswer as dns.SoaRecord;
      records = [
        {
          value: `${s.nsname} ${s.hostmaster} (serial ${s.serial}, refresh ${s.refresh}s, min ${s.minttl}s)`,
        },
      ];
    }

    const filtered =
      (qType === "A" && records.some((r) => r.value === "0.0.0.0")) ||
      (qType === "AAAA" && records.some((r) => r.value === "::"));

    return NextResponse.json({
      domain: rawDomain,
      type: qType,
      server: serverIp,
      latencyMs,
      status: filtered ? "BLOCKED_SAFEDNS" : "NOERROR",
      filtered,
      records,
    });
  } catch (err: any) {
    const latencyMs = Math.max(1, Date.now() - startedAt);
    const code = err?.code || "ERROR";
    return NextResponse.json({
      domain: rawDomain,
      type: qType,
      server: serverIp,
      latencyMs,
      status: code === "ENOTFOUND" || code === "ENODATA" ? code : "ERROR",
      filtered: false,
      records: [],
      message:
        code === "ENOTFOUND"
          ? "Domain not found (NXDOMAIN)"
          : code === "ENODATA"
            ? `No ${qType} records found for ${rawDomain}`
            : err?.message || "Lookup failed",
    });
  }
}
