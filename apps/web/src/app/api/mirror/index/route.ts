import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MIRROR_ORIGIN = "https://mirror.masdika.id";

const ALLOWED_PREFIXES = [
  "/ubuntu/",
  "/ubuntu-releases/",
  "/debian/",
  "/debian-cd/",
  "/debian-cd-archive/",
  "/debian-cd-testing/",
  "/debian-security/",
  "/kali/",
  "/kali-images/",
  "/parrot/",
  "/linuxmint/",
  "/linuxmint-iso/",
  "/almalinux/",
  "/rocky/",
  "/centos-stream/",
  "/epel/",
  "/archlinux/",
  "/alpine/",
  "/freebsd/",
  "/freebsd-pkg/",
  "/openbsd/",
  "/mikrotik/",
];

export interface MirrorIndexEntry {
  name: string;
  href: string;
  isDir: boolean;
  size: string;
  lastSync: string;
}

function stripTags(html: string): string {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function normalizePath(raw: string): string | null {
  let clean = raw.trim();
  if (!clean.startsWith("/")) clean = "/" + clean;
  if (!clean.endsWith("/")) clean += "/";
  if (clean.includes("..")) return null;
  const allowed = ALLOWED_PREFIXES.some((p) => clean.startsWith(p));
  return allowed ? clean : null;
}

function parseDirectoryHtml(html: string, basePath: string): MirrorIndexEntry[] {
  const entries: MirrorIndexEntry[] = [];
  const seen = new Set<string>();

  const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let trMatch: RegExpExecArray | null;
  while ((trMatch = trRegex.exec(html)) !== null) {
    const row = trMatch[1];
    const linkMatch = row.match(/<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/i);
    if (!linkMatch) continue;

    const rawHref = linkMatch[1];
    const rawName = stripTags(linkMatch[2]);
    if (
      !rawHref ||
      rawHref.startsWith("?") ||
      rawHref.startsWith("/") ||
      rawHref === "../" ||
      rawHref === "./" ||
      rawName.toLowerCase().includes("parent directory")
    ) {
      continue;
    }

    const tdMatches = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((m) =>
      stripTags(m[1])
    );

    const isDir = rawHref.endsWith("/");
    let size = "-";
    let lastSync = "-";

    if (tdMatches.length >= 3) {
      const col1 = tdMatches[tdMatches.length - 2] || "-";
      const col2 = tdMatches[tdMatches.length - 1] || "-";
      if (/^\d{4}-|^[A-Za-z]+ \d+|\d{2}:\d{2}/.test(col1)) {
        lastSync = col1;
        size = isDir ? "-" : col2 || "-";
      } else {
        size = isDir ? "-" : col1 || "-";
        lastSync = col2 || "-";
      }
    }

    const cleanHref = rawHref.split("?")[0];
    const fullHref = basePath + cleanHref;
    if (seen.has(fullHref)) continue;
    seen.add(fullHref);

    entries.push({
      name: rawName || cleanHref,
      href: fullHref,
      isDir,
      size: size === "-" || size === "" ? "-" : size,
      lastSync: lastSync || "-",
    });
  }

  if (entries.length > 0) {
    return entries.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
  }

  const preLineRegex = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>([^\n<]*)/gi;
  let preMatch: RegExpExecArray | null;
  while ((preMatch = preLineRegex.exec(html)) !== null) {
    const rawHref = preMatch[1];
    const rawName = stripTags(preMatch[2]);
    const tail = (preMatch[3] || "").trim();

    if (
      !rawHref ||
      rawHref.startsWith("?") ||
      rawHref.startsWith("/") ||
      rawHref.startsWith("http") ||
      rawHref === "../" ||
      rawHref === "./" ||
      rawName.toLowerCase().includes("parent directory")
    ) {
      continue;
    }

    const isDir = rawHref.endsWith("/");
    let lastSync = "-";
    let size = "-";

    if (tail) {
      const parts = tail.split(/\s{2,}/).filter(Boolean);
      if (parts.length >= 2) {
        lastSync = parts[0];
        size = isDir ? "-" : parts[1];
      } else if (parts.length === 1) {
        lastSync = parts[0];
      }
    }

    const cleanHref = rawHref.split("?")[0];
    const fullHref = basePath + cleanHref;
    if (seen.has(fullHref)) continue;
    seen.add(fullHref);

    entries.push({
      name: rawName || cleanHref,
      href: fullHref,
      isDir,
      size: size === "-" || size === "" ? "-" : size,
      lastSync,
    });
  }

  return entries.sort((a, b) => Number(b.isDir) - Number(a.isDir) || a.name.localeCompare(b.name));
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "-";
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / 1024 ** 3).toFixed(2)} GiB`;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${bytes} B`;
}

let mtVersionsCache: Record<string, { at: number; items: MirrorIndexEntry[] }> = {};
const mtFilesCache = new Map<string, { at: number; items: MirrorIndexEntry[] }>();
const MT_CACHE_TTL = 3_600_000;

async function fetchLatestMikrotikTag(url: string, fallback: string): Promise<string> {
  try {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 3500);
    const r = await fetch(url, { signal: c.signal, cache: "no-store" });
    clearTimeout(t);
    if (r.ok) {
      const ver = (await r.text()).trim().split(/\s+/)[0];
      if (ver && /^\d+\.\d+(\.\d+)?$/.test(ver)) return ver;
    }
  } catch {}
  return fallback;
}

async function fetchMikrotikVersionsFromChangelog(
  major: "6" | "7",
  baseFolder: "RouterOS_v6" | "RouterOS_v7" | "CHR"
): Promise<MirrorIndexEntry[]> {
  const cacheKey = `${major}:${baseFolder}`;
  const cached = mtVersionsCache[cacheKey];
  if (cached && Date.now() - cached.at < MT_CACHE_TTL) {
    return cached.items;
  }

  const latestVer =
    major === "7"
      ? await fetchLatestMikrotikTag("https://upgrade.mikrotik.com/routeros/NEWESTa7.stable", "7.25.2")
      : await fetchLatestMikrotikTag("https://upgrade.mikrotik.com/routeros/NEWEST6.stable", "6.49.23");

  const entries: MirrorIndexEntry[] = [];
  const seen = new Set<string>();

  for (const changelogUrl of [
    `${MIRROR_ORIGIN}/mikrotik/${latestVer}/CHANGELOG`,
    `https://download.mikrotik.com/routeros/${latestVer}/CHANGELOG`,
  ]) {
    try {
      const c = new AbortController();
      const t = setTimeout(() => c.abort(), 5000);
      const r = await fetch(changelogUrl, { signal: c.signal, cache: "no-store" });
      clearTimeout(t);
      if (!r.ok) continue;
      const text = await r.text();
      const regex = new RegExp(`What's new in (${major}\\.\\d+(?:\\.\\d+)*)\\s*\\(([^)]+)\\)`, "g");
      let m: RegExpExecArray | null;
      while ((m = regex.exec(text)) !== null) {
        const ver = m[1];
        const dateStr = m[2].trim();
        if (seen.has(ver)) continue;
        seen.add(ver);
        entries.push({
          name: `${ver}/`,
          href: `/mikrotik/${baseFolder}/${ver}/`,
          isDir: true,
          size: "-",
          lastSync: dateStr,
        });
      }
      if (entries.length > 0) break;
    } catch {}
  }

  if (!seen.has(latestVer)) {
    entries.unshift({
      name: `${latestVer}/`,
      href: `/mikrotik/${baseFolder}/${latestVer}/`,
      isDir: true,
      size: "-",
      lastSync: "Latest Official",
    });
  }

  if (entries.length > 0) {
    mtVersionsCache[cacheKey] = { at: Date.now(), items: entries };
  }
  return entries;
}

async function fetchMikrotikVersionFiles(ver: string, chrOnly = false): Promise<MirrorIndexEntry[]> {
  const cacheKey = `${ver}:${chrOnly ? "chr" : "all"}`;
  const cached = mtFilesCache.get(cacheKey);
  if (cached && Date.now() - cached.at < MT_CACHE_TTL) {
    return cached.items;
  }

  const isV6 = ver.startsWith("6.");
  const archs = isV6
    ? ["x86", "mipsbe", "arm", "arm64", "mmips", "smips", "tile", "powerpc"]
    : ["x86", "arm", "arm64", "mipsbe", "mmips", "smips", "tile", "ppc"];

  const chrCandidates = [
    `chr-${ver}.img.zip`,
    `chr-${ver}.vmdk.zip`,
    `chr-${ver}.vhdx.zip`,
    `chr-${ver}.ova`,
    `chr-${ver}.vdi.zip`,
    `chr-${ver}.qcow2.zip`,
  ];

  const routerOsCandidates = [
    `mikrotik-${ver}.iso`,
    `install-image-${ver}.zip`,
    `netinstall-${ver}.zip`,
    `netinstall-${ver}.tar.gz`,
    ...archs.map((a) => (isV6 ? `routeros-${a}-${ver}.npk` : `routeros-${ver}-${a}.npk`)),
    ...archs.map((a) => `all_packages-${a}-${ver}.zip`),
    ...chrCandidates,
    "CHANGELOG",
  ];

  const candidates = chrOnly ? chrCandidates : routerOsCandidates;

  const probed = await Promise.all(
    candidates.map(async (name): Promise<MirrorIndexEntry | null> => {
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 3500);
        const r = await fetch(`${MIRROR_ORIGIN}/mikrotik/${ver}/${name}`, {
          method: "HEAD",
          signal: c.signal,
          cache: "no-store",
        });
        clearTimeout(t);
        if (!r.ok) return null;
        const len = Number(r.headers.get("content-length") || 0);
        const lastMod = r.headers.get("last-modified");
        const lastSync = lastMod ? new Date(lastMod).toISOString().slice(0, 16).replace("T", " ") : `v${ver}`;
        return {
          name,
          href: `/mikrotik/${ver}/${name}`,
          isDir: false,
          size: formatBytes(len),
          lastSync,
        };
      } catch {
        return null;
      }
    })
  );

  const items = probed.filter((x): x is MirrorIndexEntry => x !== null);
  if (items.length > 0) {
    mtFilesCache.set(cacheKey, { at: Date.now(), items });
  }
  return items;
}

export async function GET(req: NextRequest) {
  const rawPath = req.nextUrl.searchParams.get("path") || "/ubuntu/";
  const path = normalizePath(rawPath);

  if (!path) {
    return NextResponse.json({ error: "Invalid repository path" }, { status: 400 });
  }

  try {
    if (path === "/mikrotik/") {
      return NextResponse.json({
        path,
        entries: [
          { name: "RouterOS_v7/", href: "/mikrotik/RouterOS_v7/", isDir: true, size: "-", lastSync: "All Official v7 Releases" },
          { name: "RouterOS_v6/", href: "/mikrotik/RouterOS_v6/", isDir: true, size: "-", lastSync: "All Official v6 Releases" },
          { name: "CHR/", href: "/mikrotik/CHR/", isDir: true, size: "-", lastSync: "Cloud Hosted Router (v6 & v7)" },
        ],
      });
    }

    if (path === "/mikrotik/RouterOS_v7/") {
      return NextResponse.json({ path, entries: await fetchMikrotikVersionsFromChangelog("7", "RouterOS_v7") });
    }
    if (path === "/mikrotik/RouterOS_v6/") {
      return NextResponse.json({ path, entries: await fetchMikrotikVersionsFromChangelog("6", "RouterOS_v6") });
    }
    if (path === "/mikrotik/CHR/") {
      const [v7, v6] = await Promise.all([
        fetchMikrotikVersionsFromChangelog("7", "CHR"),
        fetchMikrotikVersionsFromChangelog("6", "CHR"),
      ]);
      return NextResponse.json({ path, entries: [...v7, ...v6] });
    }

    const verMatch = path.match(/^\/mikrotik\/(RouterOS_v[67]|CHR|official)\/([0-9]+\.[0-9]+(?:\.[0-9]+)*)\/$/);
    if (verMatch) {
      const entries = await fetchMikrotikVersionFiles(verMatch[2], verMatch[1] === "CHR");
      return NextResponse.json({ path, entries });
    }

    const res = await fetch(`${MIRROR_ORIGIN}${path}`, {
      headers: {
        "User-Agent": "Masdika-Mirror-Browser/1.0",
        Accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Mirror returned HTTP ${res.status}`, path, entries: [] },
        { status: res.status }
      );
    }

    const html = await res.text();
    const entries = parseDirectoryHtml(html, path);
    return NextResponse.json({ path, entries });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : "Failed to fetch directory index",
        path,
        entries: [],
      },
      { status: 500 }
    );
  }
}
