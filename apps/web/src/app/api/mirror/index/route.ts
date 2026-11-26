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

async function fetchMikrotikOfficialVersions(): Promise<MirrorIndexEntry[]> {
  const channels = [
    { url: "https://upgrade.mikrotik.com/routeros/NEWESTa7.stable", label: "RouterOS v7 Stable (Official)" },
    { url: "https://upgrade.mikrotik.com/routeros/NEWESTa7.testing", label: "RouterOS v7 Testing (Official)" },
    { url: "https://upgrade.mikrotik.com/routeros/NEWEST7.stable", label: "RouterOS v7 Legacy Stable" },
  ];

  const seen = new Set<string>();
  const results: MirrorIndexEntry[] = [];

  await Promise.all(
    channels.map(async (ch) => {
      try {
        const c = new AbortController();
        const t = setTimeout(() => c.abort(), 3500);
        const r = await fetch(ch.url, { signal: c.signal, cache: "no-store" });
        clearTimeout(t);
        if (!r.ok) return;
        const text = (await r.text()).trim();
        const ver = text.split(/\s+/)[0];
        if (!ver || !/^\d+\.\d+(\.\d+)?$/.test(ver) || seen.has(ver)) return;
        seen.add(ver);
        const tsNum = Number(text.split(/\s+/)[1]);
        const lastSync = Number.isFinite(tsNum) && tsNum > 0
          ? new Date(tsNum * 1000).toISOString().slice(0, 16).replace("T", " ")
          : ch.label;
        results.push({
          name: `${ver}/`,
          href: `/mikrotik/official/${ver}/`,
          isDir: true,
          size: "-",
          lastSync: `${lastSync} (${ch.label})`,
        });
      } catch {}
    })
  );

  return results.sort((a, b) => b.name.localeCompare(a.name, undefined, { numeric: true }));
}

function buildMikrotikVersionFiles(ver: string, basePath: string): MirrorIndexEntry[] {
  const files = [
    `mikrotik-${ver}.iso`,
    `chr-${ver}.img.zip`,
    `chr-${ver}.vmdk.zip`,
    `chr-${ver}.vhdx.zip`,
    `chr-${ver}.ova`,
    `routeros-${ver}-x86.npk`,
    `routeros-${ver}-arm.npk`,
    `routeros-${ver}-arm64.npk`,
    `routeros-${ver}-mipsbe.npk`,
    `all_packages-x86-${ver}.zip`,
    `all_packages-arm64-${ver}.zip`,
    `netinstall-${ver}.zip`,
  ];

  return files.map((name) => ({
    name,
    href: `${basePath}${name}`,
    isDir: false,
    size: "Official",
    lastSync: `v${ver}`,
  }));
}

export async function GET(req: NextRequest) {
  const rawPath = req.nextUrl.searchParams.get("path") || "/ubuntu/";
  const path = normalizePath(rawPath);

  if (!path) {
    return NextResponse.json({ error: "Invalid repository path" }, { status: 400 });
  }

  try {
    if (path === "/mikrotik/official/") {
      const entries = await fetchMikrotikOfficialVersions();
      return NextResponse.json({ path, entries });
    }

    const officialVerMatch = path.match(/^\/mikrotik\/official\/([0-9]+\.[0-9]+(?:\.[0-9]+)?)\/$/);
    if (officialVerMatch) {
      const entries = buildMikrotikVersionFiles(officialVerMatch[1], path);
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

    if (path === "/mikrotik/") {
      entries.unshift({
        name: "official/",
        href: "/mikrotik/official/",
        isDir: true,
        size: "-",
        lastSync: "Latest RouterOS v7.25+ & CHR (Official)",
      });
    }

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
