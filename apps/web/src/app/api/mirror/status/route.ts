import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MIRROR_BASE = "https://mirror.masdika.id";

const PROBES: Array<{ id: string; name: string; path: string }> = [
  { id: "ubuntu", name: "Ubuntu", path: "/ubuntu/dists/noble/InRelease" },
  { id: "debian", name: "Debian", path: "/debian/dists/bookworm/InRelease" },
  { id: "linuxmint", name: "Linux Mint", path: "/linuxmint/" },
  { id: "kali", name: "Kali Linux", path: "/kali/dists/kali-rolling/InRelease" },
  { id: "parrot", name: "Parrot OS", path: "/parrot/" },
  { id: "almalinux", name: "AlmaLinux", path: "/almalinux/9/BaseOS/x86_64/os/repodata/repomd.xml" },
  { id: "rocky", name: "Rocky Linux", path: "/rocky/9/BaseOS/x86_64/os/repodata/repomd.xml" },
  { id: "centos-stream", name: "CentOS Stream", path: "/centos-stream/9-stream/BaseOS/x86_64/os/repodata/repomd.xml" },
  { id: "epel", name: "EPEL (RHEL)", path: "/epel/9/Everything/x86_64/repodata/repomd.xml" },
  { id: "archlinux", name: "Arch Linux", path: "/archlinux/core/os/x86_64/core.db" },
  { id: "alpine", name: "Alpine Linux", path: "/alpine/latest-stable/main/x86_64/APKINDEX.tar.gz" },
  { id: "freebsd", name: "FreeBSD", path: "/freebsd/releases/ISO-IMAGES/" },
  { id: "openbsd", name: "OpenBSD", path: "/openbsd/" },
];

export interface DistroHealth {
  id: string;
  name: string;
  ok: boolean;
  status: number;
  latencyMs: number;
}

export interface MirrorStatusPayload {
  overallStatus: "operational" | "degraded" | "outage";
  mirrorReachable: boolean;
  checkedAt: string;
  upCount: number;
  totalCount: number;
  downNames: string[];
  distros: Record<string, DistroHealth>;
}

let cachedPayload: MirrorStatusPayload | null = null;
let cachedAtMs = 0;
const CACHE_TTL_MS = 60_000;

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

export async function GET() {
  const now = Date.now();
  if (cachedPayload && now - cachedAtMs < CACHE_TTL_MS) {
    return NextResponse.json(cachedPayload);
  }

  const healthProbe = await probeUrl(`${MIRROR_BASE}/health`, 3500);

  const results = await Promise.all(
    PROBES.map(async (p) => {
      if (!healthProbe.ok) {
        return { id: p.id, name: p.name, ok: false, status: 0, latencyMs: 0 };
      }
      const r = await probeUrl(`${MIRROR_BASE}${p.path}`, 4000);
      return { id: p.id, name: p.name, ...r };
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

  const payload: MirrorStatusPayload = {
    overallStatus,
    mirrorReachable: healthProbe.ok,
    checkedAt: new Date().toISOString(),
    upCount,
    totalCount: PROBES.length,
    downNames,
    distros,
  };

  cachedPayload = payload;
  cachedAtMs = now;

  return NextResponse.json(payload);
}
