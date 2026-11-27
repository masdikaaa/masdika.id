import { NextRequest, NextResponse } from "next/server";
import { getCachedData, setCachedData } from "@/lib/cache";

export const dynamic = "force-dynamic";

const MIRROR_BASE = "https://mirror.masdika.id";

const PROBES: Array<{
  id: string;
  name: string;
  path: string;
  versionIndexPath?: string;
  versionFilter?: RegExp;
}> = [
  { id: "ubuntu", name: "Ubuntu", path: "/ubuntu/dists/noble/InRelease", versionIndexPath: "/ubuntu-releases/", versionFilter: /^(2[0-9]\.\d{2})(\.\d+)?$/ },
  { id: "debian", name: "Debian", path: "/debian/dists/bookworm/InRelease", versionIndexPath: "/debian/dists/", versionFilter: /^(bookworm|trixie|forky|testing|sid)$/ },
  { id: "linuxmint", name: "Linux Mint", path: "/linuxmint/", versionIndexPath: "/linuxmint/dists/", versionFilter: /^[a-z]+$/ },
  { id: "kali", name: "Kali Linux", path: "/kali/dists/kali-rolling/InRelease" },
  { id: "parrot", name: "Parrot OS", path: "/parrot/", versionIndexPath: "/parrot/dists/", versionFilter: /^[a-z0-9.-]+$/ },
  { id: "almalinux", name: "AlmaLinux", path: "/almalinux/", versionIndexPath: "/almalinux/", versionFilter: /^(8|9|10|11|\d+\.\d+)$/ },
  { id: "rocky", name: "Rocky Linux", path: "/rocky/", versionIndexPath: "/rocky/", versionFilter: /^(8|9|10|11|\d+\.\d+)$/ },
  { id: "centos-stream", name: "CentOS Stream", path: "/centos-stream/", versionIndexPath: "/centos-stream/", versionFilter: /^\d+-stream$/ },
  { id: "epel", name: "EPEL (RHEL)", path: "/epel/9/Everything/x86_64/repodata/repomd.xml", versionIndexPath: "/epel/", versionFilter: /^(\d+)$/ },
  { id: "archlinux", name: "Arch Linux", path: "/archlinux/core/os/x86_64/core.db" },
  { id: "alpine", name: "Alpine Linux", path: "/alpine/latest-stable/main/x86_64/APKINDEX.tar.gz", versionIndexPath: "/alpine/", versionFilter: /^(v3\.\d+|latest-stable|edge)$/ },
  { id: "freebsd", name: "FreeBSD", path: "/freebsd/releases/ISO-IMAGES/", versionIndexPath: "/freebsd/releases/ISO-IMAGES/", versionFilter: /^1\d\.\d+$/ },
  { id: "openbsd", name: "OpenBSD", path: "/openbsd/", versionIndexPath: "/openbsd/", versionFilter: /^(\d+\.\d+|snapshots)$/ },
  { id: "mikrotik", name: "MikroTik RouterOS", path: "/mikrotik/7.25.2/mikrotik-7.25.2.iso" },
  { id: "proxmox", name: "Proxmox VE", path: "/proxmox/debian/dists/trixie/InRelease", versionIndexPath: "/proxmox/debian/dists/", versionFilter: /^(bullseye|bookworm|trixie)$/ },
];

export interface DistroHealth {
  id: string;
  name: string;
  ok: boolean;
  status: number;
  latencyMs: number;
  detectedVersions?: string;
}

export interface MirrorTelemetry {
  updatedAt: string;
  totalRequests: number;
  totalBytesServed: number;
  cacheHitRatio: number;
  cacheUsedBytes: number;
  diskTotalBytes: number;
  diskUsedBytes: number;
  diskFreeBytes: number;
  topRepos: Array<{ name: string; requests: number }>;
}

export interface MirrorStatusPayload {
  overallStatus: "operational" | "degraded" | "outage";
  mirrorReachable: boolean;
  checkedAt: string;
  upCount: number;
  totalCount: number;
  downNames: string[];
  distros: Record<string, DistroHealth>;
  telemetry?: MirrorTelemetry | null;
}

const STATUS_CACHE_TTL_SEC = 60;
const VERSIONS_CACHE_TTL_SEC = 3600;

async function probeUrl(url: string, timeoutMs = 4000): Promise<{ ok: boolean; status: number; latencyMs: number }> {
  const start = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      cache: "no-store",
      headers: { "User-Agent": "Masdika-Mirror-HealthCheck/1.0" },
    });
    return {
      ok: res.ok,
      status: res.status,
      latencyMs: Date.now() - start,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      latencyMs: Date.now() - start,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function detectVersions(indexPath: string, filter: RegExp): Promise<string | undefined> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const res = await fetch(`${MIRROR_BASE}${indexPath}`, {
      signal: controller.signal,
      cache: "no-store",
      headers: {
        "User-Agent": "Masdika-Mirror-Browser/1.0",
        Accept: "text/html",
      },
    });
    if (!res.ok) return undefined;
    const html = await res.text();
    const dirs = new Set<string>();
    const regex = /<a[^>]+href=["']([^"'/?]+)\/["']/gi;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(html)) !== null) {
      const name = m[1].trim();
      if (filter.test(name)) dirs.add(name);
    }
    if (dirs.size === 0) return undefined;
    const sorted = [...dirs].sort();
    const latest = sorted.slice(-4);
    return latest.join(" - ");
  } catch {
    return undefined;
  } finally {
    clearTimeout(timer);
  }
}

async function computeMirrorStatus(): Promise<MirrorStatusPayload> {
  const [healthProbe, telemetry] = await Promise.all([
    probeUrl(`${MIRROR_BASE}/health`, 4000),
    (async (): Promise<MirrorTelemetry | null> => {
      for (const url of [`${MIRROR_BASE}/_telemetry.json`, "http://192.168.79.21/_telemetry.json"]) {
        try {
          const c = new AbortController();
          const t = setTimeout(() => c.abort(), 2500);
          const r = await fetch(url, { signal: c.signal, cache: "no-store" });
          clearTimeout(t);
          if (r.ok) {
            return (await r.json()) as MirrorTelemetry;
          }
        } catch {}
      }
      return null;
    })(),
  ]);

  const detectedVersionsMap = healthProbe.ok
    ? await getCachedData<Record<string, string>>(
        "mirror:versions:v1",
        VERSIONS_CACHE_TTL_SEC,
        async () => {
          const versionEntries = await Promise.all(
            PROBES.filter((p) => p.versionIndexPath && p.versionFilter).map(async (p) => {
              const v = await detectVersions(p.versionIndexPath!, p.versionFilter!);
              return [p.id, v] as const;
            })
          );
          const nextVersions: Record<string, string> = {};
          for (const [id, v] of versionEntries) {
            if (v) nextVersions[id] = v;
          }
          return nextVersions;
        }
      )
    : {};

  const results = await Promise.all(
    PROBES.map(async (p) => {
      if (!healthProbe.ok) {
        return { id: p.id, name: p.name, ok: false, status: 0, latencyMs: 0 };
      }
      const r = await probeUrl(`${MIRROR_BASE}${p.path}`, 6000);
      return {
        id: p.id,
        name: p.name,
        ...r,
        detectedVersions: detectedVersionsMap[p.id],
      };
    })
  );

  const distros: Record<string, DistroHealth> = {};
  const downNames: string[] = [];
  let upCount = 0;

  for (const item of results) {
    distros[item.id] = item;
    if (item.ok) {
      upCount++;
    } else {
      downNames.push(item.name);
    }
  }

  const overallStatus: MirrorStatusPayload["overallStatus"] = !healthProbe.ok
    ? "outage"
    : downNames.length > 0
      ? "degraded"
      : "operational";

  return {
    overallStatus,
    mirrorReachable: healthProbe.ok,
    checkedAt: new Date().toISOString(),
    upCount,
    totalCount: PROBES.length,
    downNames,
    distros,
    telemetry,
  };
}

export async function GET(req: NextRequest) {
  const forceRefresh = req.nextUrl.searchParams.get("refresh") === "1";

  if (forceRefresh) {
    const fresh = await computeMirrorStatus();
    await setCachedData("mirror:status:v1", STATUS_CACHE_TTL_SEC, fresh);
    return NextResponse.json(fresh);
  }

  const payload = await getCachedData<MirrorStatusPayload>(
    "mirror:status:v1",
    STATUS_CACHE_TTL_SEC,
    computeMirrorStatus
  );

  return NextResponse.json(payload);
}
