import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-middleware";
import { getPdnsRuntimeConfig } from "@/lib/powerdns";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAuth({ allowedRoles: ["ADMIN"] });
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const cfg = await getPdnsRuntimeConfig();
    if (!cfg.configured) {
      return NextResponse.json({ available: false, reason: "PowerDNS not configured" });
    }

    const parsed = new URL(cfg.apiUrl);
    const statsUrl = `${parsed.protocol}//${parsed.hostname}:8083/jsonstat?command=stats`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(statsUrl, {
        headers: { "X-API-Key": cfg.apiKey },
        signal: controller.signal,
        cache: "no-store",
      });

      if (!res.ok) {
        return NextResponse.json({ available: false, reason: `HTTP ${res.status}` });
      }

      const raw = await res.json();
      const queries = Number(raw.queries || 0);
      const rdQueries = Number(raw.rdqueries || 0);
      const authQueries = Math.max(0, queries - rdQueries);
      const cacheHits = Number(raw["cache-hits"] || 0);
      const cacheMisses = Number(raw["cache-misses"] || 0);
      const nxdomainAnswers = Number(raw["nxdomain-answers"] || 0);
      const servfailAnswers = Number(raw["servfail-answers"] || 0);
      const noerrorAnswers = Number(raw["noerror-answers"] || 0);
      const aclDrops = Number(raw["acl-drops"] || 0);
      const ruleDrop = Number(raw["rule-drop"] || 0);

      const lat0_1 = Number(raw["latency0-1"] || 0);
      const lat1_10 = Number(raw["latency1-10"] || 0);
      const lat10_50 = Number(raw["latency10-50"] || 0);
      const lat50_100 = Number(raw["latency50-100"] || 0);
      const lat100_plus = Number(raw["latency100-1000"] || 0) + Number(raw["latency-slow"] || 0);

      return NextResponse.json({
        available: true,
        queries,
        rdQueries,
        authQueries,
        cacheHits,
        cacheMisses,
        noerrorAnswers,
        nxdomainAnswers,
        servfailAnswers,
        blockedOrDropped: aclDrops + ruleDrop,
        uptimeSec: Number(raw.uptime || 0),
        latencyAvgUs: Number(raw["latency-avg100"] || 0),
        latencyBuckets: [
          { label: "< 1ms", count: lat0_1 },
          { label: "1-10ms", count: lat1_10 },
          { label: "10-50ms", count: lat10_50 },
          { label: "50-100ms", count: lat50_100 },
          { label: "> 100ms", count: lat100_plus },
        ],
      });
    } finally {
      clearTimeout(timer);
    }
  } catch (error: any) {
    return NextResponse.json({
      available: false,
      reason: error?.message || "Stats endpoint unreachable",
    });
  }
}
