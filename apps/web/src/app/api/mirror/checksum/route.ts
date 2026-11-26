import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const MIRROR_ORIGIN = "https://mirror.masdika.id";

const CHECKSUM_FILES = [
  "SHA256SUMS",
  "SHA256SUMS.txt",
  "sha256sum.txt",
  "SHA256",
  "CHECKSUM",
  "CHECKSUM.SHA256",
  "sha256.txt",
];

export async function GET(req: NextRequest) {
  const rawPath = req.nextUrl.searchParams.get("path") || "";
  if (!rawPath.startsWith("/") || rawPath.includes("..")) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const lastSlash = rawPath.lastIndexOf("/");
  if (lastSlash <= 0) {
    return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
  }

  const dirPath = rawPath.slice(0, lastSlash + 1);
  const fileName = rawPath.slice(lastSlash + 1);
  if (!fileName) {
    return NextResponse.json({ error: "Filename required" }, { status: 400 });
  }

  for (const csFile of CHECKSUM_FILES) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    try {
      const res = await fetch(`${MIRROR_ORIGIN}${dirPath}${csFile}`, {
        signal: controller.signal,
        headers: { "User-Agent": "Masdika-Mirror-Checksum/1.0" },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const text = await res.text();
      if (!text || text.length > 512_000) continue;

      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (!line.includes(fileName)) continue;
        // Format 1: "<64-hex>  filename" or "<64-hex> *filename"
        const stdMatch = line.match(/\b([a-fA-F0-9]{64})\b/);
        if (stdMatch) {
          return NextResponse.json({
            found: true,
            sha256: stdMatch[1].toLowerCase(),
            sourceFile: csFile,
          });
        }
      }
    } catch {
      // try next checksum filename
    } finally {
      clearTimeout(timer);
    }
  }

  return NextResponse.json({ found: false, error: "SHA256 checksum not published in this directory" }, { status: 404 });
}
