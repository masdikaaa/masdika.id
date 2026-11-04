/**
 * Centralized File Upload Security & Anti-WebShell Validation Module
 * Protects all upload endpoints (Admin, Customer CDN, Tickets, Profile Avatars, Voice STT)
 * against:
 *  1. Web shells (PHP, JSP, ASPX, CGI, Python, Perl, Bash/Sh)
 *  2. Executable binaries (Windows PE/EXE/DLL, Linux ELF, macOS Mach-O)
 *  3. Polyglot files (valid image headers with appended PHP/HTML/JS shells)
 *  4. Double extensions & path traversal (e.g., shell.php.jpg, ../../shell.sh)
 *  5. MIME spoofing & corrupted/fake images ("foto gak jelas" / garbage bytes)
 *  6. Stored XSS via SVG / HTML / XML uploads
 */

// Dangerous extensions that must NEVER appear anywhere in a filename (including double extensions like file.php.jpg)
const FORBIDDEN_EXTENSION_PARTS = new Set([
  // Server-side scripts & web shells
  "php", "php2", "php3", "php4", "php5", "php6", "php7", "php8", "phtml", "phar", "phps", "pht", "pgif", "inc",
  "jsp", "jspx", "jsw", "jsv", "jspf", "war", "jar", "class",
  "asp", "aspx", "ascx", "ashx", "asmx", "cer", "asa", "asax", "soap", "config",
  "cfm", "cfml", "cfc", "dbm",
  "pl", "pm", "cgi", "fcgi", "lib",
  "py", "pyc", "pyo", "pyd", "wsgi",
  "rb", "erb", "rhtml",
  // Shell & OS scripts / executables
  "sh", "bash", "zsh", "csh", "ksh", "fish", "run", "bin", "elf",
  "exe", "dll", "so", "dylib", "sys", "drv", "com", "scr", "msi", "msp",
  "bat", "cmd", "ps1", "psm1", "psd1", "vbs", "vbe", "js", "jse", "wsf", "wsh", "hta", "cpl", "reg", "inf", "sct",
  // Web / XSS active content
  "html", "htm", "xhtml", "shtml", "dhtml", "mhtml", "svg", "svgz", "xml", "xsl", "xslt", "swf",
  // Server / credential / config files
  "htaccess", "htpasswd", "env", "ini", "conf", "cnf", "pem", "key", "crt", "pfx", "p12", "pub", "ppk", "kdbx",
]);

// Suspicious text/script signatures scanned in file headers & tails (case-insensitive)
const MALICIOUS_TEXT_PATTERNS: RegExp[] = [
  /<\?php/i,
  /<\?=/,
  /<script[\s>]/i,
  /<!doctype\s+html/i,
  /<html[\s>]/i,
  /<iframe[\s>]/i,
  /<object[\s>]/i,
  /<embed[\s>]/i,
  /<svg[\s>]/i,
  /<%\s*@/,
  /\beval\s*\(\s*(?:base64_decode|gzinflate|str_rot13|gzuncompress|\$_)/i,
  /\b(?:shell_exec|passthru|proc_open|popen|pcntl_exec|assert)\s*\(/i,
  /\b(?:system|exec)\s*\(\s*\$(?:_GET|_POST|_REQUEST|_COOKIE|_SERVER)/i,
  /\b(?:\$_GET|\$_POST|\$_REQUEST|\$_FILES)\s*\[/i,
  /\bpowershell(?:\.exe)?\s+-(?:enc|e|w\s+hidden|nop|noni)/i,
  /\bcmd(?:\.exe)?\s+\/c\b/i,
  /\/bin\/(?:ba)?sh\s+-i\b/i,
];

/**
 * Checks if a filename has a forbidden extension or dangerous double extension (e.g., `shell.php.jpg`, `.htaccess`).
 */
export function hasForbiddenExtension(filename: string): { forbidden: boolean; reason?: string } {
  const raw = (filename || "").trim();
  if (!raw) {
    return { forbidden: true, reason: "Nama file kosong atau tidak valid." };
  }

  // Block null bytes or path traversal attempts in original filename
  if (raw.includes("\0") || raw.includes("..") || raw.includes("/") || raw.includes("\\")) {
    return { forbidden: true, reason: "Nama file mengandung karakter path ilegal." };
  }

  const lower = raw.toLowerCase();
  if (lower.startsWith(".")) {
    return { forbidden: true, reason: "Dotfile / file konfigurasi tersembunyi tidak diizinkan." };
  }

  const parts = lower.split(".");
  if (parts.length < 2) {
    return { forbidden: true, reason: "File harus memiliki ekstensi yang jelas." };
  }

  // Check every extension segment (after the first part) to block double extensions like `shell.php.png`
  for (let i = 1; i < parts.length; i++) {
    const seg = parts[i].trim();
    if (FORBIDDEN_EXTENSION_PARTS.has(seg)) {
      return {
        forbidden: true,
        reason: `Ekstensi file berbahaya (.${seg}) terdeteksi dan diblokir demi keamanan server.`,
      };
    }
  }

  return { forbidden: false };
}

/**
 * Scans a Buffer (head & tail) for executable headers (EXE/DLL/ELF/Mach-O/Shebang) and embedded web shells / XSS payloads.
 */
export function scanBufferForMaliciousContent(
  headBuffer: Buffer,
  tailBuffer?: Buffer
): { safe: boolean; reason?: string } {
  if (!headBuffer || headBuffer.length === 0) {
    return { safe: false, reason: "File kosong (0 byte) tidak diizinkan." };
  }

  // 1. Check binary executable magic headers at offset 0
  // Windows PE /MZ Executable (.exe, .dll, .scr)
  if (headBuffer.length >= 2 && headBuffer[0] === 0x4d && headBuffer[1] === 0x5a) {
    return { safe: false, reason: "File executable Windows (PE/EXE/DLL) terdeteksi dan diblokir." };
  }

  // Linux ELF Binary (\x7F E L F)
  if (
    headBuffer.length >= 4 &&
    headBuffer[0] === 0x7f &&
    headBuffer[1] === 0x45 &&
    headBuffer[2] === 0x4c &&
    headBuffer[3] === 0x46
  ) {
    return { safe: false, reason: "File binary Linux (ELF) terdeteksi dan diblokir." };
  }

  // macOS Mach-O Binary
  if (headBuffer.length >= 4) {
    const magic32 = headBuffer.readUInt32BE(0);
    if (
      magic32 === 0xfeedface ||
      magic32 === 0xfeedfacf ||
      magic32 === 0xcefaedfe ||
      magic32 === 0xcffaedfe
    ) {
      return { safe: false, reason: "File binary Mach-O terdeteksi dan diblokir." };
    }
  }

  // Shell script shebang (#! at offset 0)
  if (headBuffer.length >= 2 && headBuffer[0] === 0x23 && headBuffer[1] === 0x21) {
    return { safe: false, reason: "Script eksekusi shell (shebang #!) terdeteksi dan diblokir." };
  }

  // 2. Scan head (up to 64KB) and tail (up to 8KB) for web shells & XSS payloads (catches polyglot images too)
  const headText = headBuffer.subarray(0, Math.min(headBuffer.length, 65536)).toString("latin1");
  for (const pattern of MALICIOUS_TEXT_PATTERNS) {
    if (pattern.test(headText)) {
      return {
        safe: false,
        reason: "Terdeteksi kode script / web shell berbahaya di dalam konten file.",
      };
    }
  }

  if (tailBuffer && tailBuffer.length > 0) {
    const tailText = tailBuffer.subarray(Math.max(0, tailBuffer.length - 8192)).toString("latin1");
    for (const pattern of MALICIOUS_TEXT_PATTERNS) {
      if (pattern.test(tailText)) {
        return {
          safe: false,
          reason: "Terdeteksi injeksi script / polyglot web shell pada bagian akhir file.",
        };
      }
    }
  }

  return { safe: true };
}

/**
 * Strictly detects the real MIME type from binary magic bytes.
 * Returns null if the signature is not a recognized binary format.
 */
export function detectStrictMagicMime(buf: Buffer): string | null {
  if (!buf || buf.length < 4) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return "image/jpeg";
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return "image/png";
  }

  // GIF: GIF87a or GIF89a
  if (
    buf.length >= 6 &&
    buf[0] === 0x47 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x38 &&
    (buf[4] === 0x37 || buf[4] === 0x39) &&
    buf[5] === 0x61
  ) {
    return "image/gif";
  }

  // WebP: RIFF....WEBP
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x45 &&
    buf[10] === 0x42 &&
    buf[11] === 0x50
  ) {
    return "image/webp";
  }

  // PDF: %PDF-
  if (
    buf.length >= 5 &&
    buf[0] === 0x25 &&
    buf[1] === 0x50 &&
    buf[2] === 0x44 &&
    buf[3] === 0x46 &&
    buf[4] === 0x2d
  ) {
    return "application/pdf";
  }

  // ISO BMFF (MP4, MOV, M4A, AVIF, HEIC, 3GP)
  if (buf.length >= 12 && buf.subarray(4, 8).toString("ascii") === "ftyp") {
    const brand = buf.subarray(8, 12).toString("ascii").toLowerCase();
    if (brand.startsWith("avif") || brand.startsWith("avis")) return "image/avif";
    if (brand.startsWith("heic") || brand.startsWith("heix") || brand === "mif1" || brand === "msf1") {
      return "image/heic";
    }
    if (brand === "qt  " || brand.startsWith("m4v")) return "video/quicktime";
    if (brand.startsWith("m4a") || brand.startsWith("m4b")) return "audio/x-m4a";
    return "video/mp4";
  }

  // WebM / MKV (EBML: 1A 45 DF A3)
  if (buf[0] === 0x1a && buf[1] === 0x45 && buf[2] === 0xdf && buf[3] === 0xa3) {
    return "video/webm";
  }

  // AVI (RIFF....AVI )
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x41 &&
    buf[9] === 0x56 &&
    buf[10] === 0x49 &&
    buf[11] === 0x20
  ) {
    return "video/x-msvideo";
  }

  // WAV (RIFF....WAVE)
  if (
    buf.length >= 12 &&
    buf[0] === 0x52 &&
    buf[1] === 0x49 &&
    buf[2] === 0x46 &&
    buf[3] === 0x46 &&
    buf[8] === 0x57 &&
    buf[9] === 0x41 &&
    buf[10] === 0x56 &&
    buf[11] === 0x45
  ) {
    return "audio/wav";
  }

  // OGG (OggS)
  if (buf[0] === 0x4f && buf[1] === 0x67 && buf[2] === 0x67 && buf[3] === 0x53) {
    return "audio/ogg";
  }

  // FLAC (fLaC)
  if (buf[0] === 0x66 && buf[1] === 0x4c && buf[2] === 0x61 && buf[3] === 0x43) {
    return "audio/flac";
  }

  // MP3 (ID3 tag or MPEG sync word)
  if (
    (buf[0] === 0x49 && buf[1] === 0x44 && buf[2] === 0x33) ||
    (buf[0] === 0xff && (buf[1] === 0xfb || buf[1] === 0xf3 || buf[1] === 0xf2 || buf[1] === 0xf1 || buf[1] === 0xf9))
  ) {
    return "audio/mpeg";
  }

  // ZIP / Office Open XML (.zip, .docx, .xlsx, .pptx) -> PK\x03\x04
  if (buf[0] === 0x50 && buf[1] === 0x4b && buf[2] === 0x03 && buf[3] === 0x04) {
    return "application/zip";
  }

  // RAR (Rar!\x1A\x07)
  if (
    buf.length >= 6 &&
    buf[0] === 0x52 &&
    buf[1] === 0x61 &&
    buf[2] === 0x72 &&
    buf[3] === 0x21 &&
    buf[4] === 0x1a &&
    buf[5] === 0x07
  ) {
    return "application/x-rar-compressed";
  }

  // 7z (37 7A BC AF 27 1C)
  if (
    buf.length >= 6 &&
    buf[0] === 0x37 &&
    buf[1] === 0x7a &&
    buf[2] === 0xbc &&
    buf[3] === 0xaf &&
    buf[4] === 0x27 &&
    buf[5] === 0x1c
  ) {
    return "application/x-7z-compressed";
  }

  // GZIP (1F 8B 08)
  if (buf[0] === 0x1f && buf[1] === 0x8b && buf[2] === 0x08) {
    return "application/gzip";
  }

  // Legacy MS Office OLE2 (.doc, .xls, .ppt) -> D0 CF 11 E0 A1 B1 1A E1
  if (
    buf.length >= 8 &&
    buf[0] === 0xd0 &&
    buf[1] === 0xcf &&
    buf[2] === 0x11 &&
    buf[3] === 0xe0 &&
    buf[4] === 0xa1 &&
    buf[5] === 0xb1 &&
    buf[6] === 0x1a &&
    buf[7] === 0xe1
  ) {
    return "application/msword";
  }

  // ICO: 00 00 01 00
  if (buf[0] === 0x00 && buf[1] === 0x00 && buf[2] === 0x01 && buf[3] === 0x00) {
    return "image/x-icon";
  }

  return null;
}

const EXTENSION_EXPECTED_MAGIC: Record<string, string[]> = {
  jpg: ["image/jpeg"],
  jpeg: ["image/jpeg"],
  png: ["image/png"],
  gif: ["image/gif"],
  webp: ["image/webp"],
  avif: ["image/avif"],
  heic: ["image/heic", "image/avif", "video/mp4"],
  heif: ["image/heic", "image/avif", "video/mp4"],
  ico: ["image/x-icon"],
  pdf: ["application/pdf"],
  mp4: ["video/mp4", "video/quicktime"],
  mov: ["video/quicktime", "video/mp4"],
  webm: ["video/webm", "audio/ogg"],
  mkv: ["video/webm"],
  avi: ["video/x-msvideo"],
  mp3: ["audio/mpeg"],
  wav: ["audio/wav"],
  ogg: ["audio/ogg", "video/webm"],
  flac: ["audio/flac"],
  m4a: ["audio/x-m4a", "video/mp4", "video/quicktime"],
  aac: ["audio/mpeg", "audio/x-m4a", "video/mp4"],
  zip: ["application/zip"],
  rar: ["application/x-rar-compressed"],
  "7z": ["application/x-7z-compressed"],
  gz: ["application/gzip"],
  docx: ["application/zip"],
  xlsx: ["application/zip"],
  pptx: ["application/zip"],
  odt: ["application/zip"],
  ods: ["application/zip"],
  odp: ["application/zip"],
  doc: ["application/msword"],
  xls: ["application/msword"],
  ppt: ["application/msword"],
};

const CANONICAL_MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  ico: "image/x-icon",
  pdf: "application/pdf",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  flac: "audio/flac",
  m4a: "audio/x-m4a",
  aac: "audio/aac",
  zip: "application/zip",
  rar: "application/x-rar-compressed",
  "7z": "application/x-7z-compressed",
  gz: "application/gzip",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  odt: "application/vnd.oasis.opendocument.text",
  ods: "application/vnd.oasis.opendocument.spreadsheet",
  odp: "application/vnd.oasis.opendocument.presentation",
  doc: "application/msword",
  xls: "application/vnd.ms-excel",
  ppt: "application/vnd.ms-powerpoint",
  txt: "text/plain",
  csv: "text/csv",
  md: "text/markdown",
  json: "application/json",
};

const SAFE_TEXT_EXTENSIONS = new Set(["txt", "csv", "md", "json"]);

/**
 * Validates a file's extension, magic bytes, and content for safety.
 * Rejects spoofed extensions (e.g., a text/PHP file renamed to .jpg or .pdf).
 */
export function validateFileUploadSecurity(params: {
  filename: string;
  headBuffer: Buffer;
  tailBuffer?: Buffer;
  allowedExtensions: Set<string>;
}): { valid: boolean; resolvedMime?: string; ext?: string; error?: string } {
  const { filename, headBuffer, tailBuffer, allowedExtensions } = params;

  // 1. Check forbidden extensions & double extensions
  const extCheck = hasForbiddenExtension(filename);
  if (extCheck.forbidden) {
    return { valid: false, error: extCheck.reason };
  }

  const ext = (filename.split(".").pop() || "").toLowerCase().trim();
  if (!allowedExtensions.has(ext)) {
    return {
      valid: false,
      error: `Tipe file .${ext} tidak diizinkan. Gunakan format yang didukung.`,
    };
  }

  // 2. Scan for web shells, executables, and XSS payloads
  const payloadScan = scanBufferForMaliciousContent(headBuffer, tailBuffer);
  if (!payloadScan.safe) {
    return { valid: false, error: payloadScan.reason };
  }

  // 3. If it's a text-based extension (txt, csv, md, json), verify it is valid UTF-8 text without null bytes
  if (SAFE_TEXT_EXTENSIONS.has(ext)) {
    const sample = headBuffer.subarray(0, Math.min(headBuffer.length, 8192));
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0x00) {
        return {
          valid: false,
          error: `File .${ext} mengandung byte biner ilegal (bukan file teks murni).`,
        };
      }
    }
    if (ext === "json") {
      // Optional lightweight sanity check on first non-whitespace char
      const trimmed = sample.toString("utf8").trimStart();
      if (trimmed.length > 0 && !["{", "["].includes(trimmed[0])) {
        return { valid: false, error: "File .json tidak memiliki struktur JSON yang valid." };
      }
    }
    return {
      valid: true,
      ext,
      resolvedMime: CANONICAL_MIME_BY_EXT[ext] || "text/plain",
    };
  }

  // 4. For binary extensions, strictly require magic byte signature match!
  const detectedMagic = detectStrictMagicMime(headBuffer);
  const expectedMagics = EXTENSION_EXPECTED_MAGIC[ext];

  if (!detectedMagic || !expectedMagics || !expectedMagics.includes(detectedMagic)) {
    return {
      valid: false,
      error: `Isi biner file tidak sesuai dengan ekstensi .${ext} (file rusak atau ekstensi dipalsukan).`,
    };
  }

  return {
    valid: true,
    ext,
    resolvedMime: CANONICAL_MIME_BY_EXT[ext] || detectedMagic,
  };
}

/**
 * Deeply validates an image buffer using both magic bytes, malicious payload scan,
 * and Sharp image decoder to block corrupted/fake images ("foto gak jelas") and polyglot shells.
 */
export async function validateRealImageBuffer(
  buffer: Buffer,
  options?: { maxWidth?: number; maxHeight?: number }
): Promise<{ valid: boolean; format?: string; width?: number; height?: number; error?: string }> {
  if (!buffer || buffer.length < 12) {
    return { valid: false, error: "File gambar kosong atau terlalu kecil." };
  }

  // 1. Scan for embedded web shells or script tags (head & tail)
  const scan = scanBufferForMaliciousContent(buffer, buffer);
  if (!scan.safe) {
    return { valid: false, error: scan.reason };
  }

  // 2. Check strict image magic bytes
  const magicMime = detectStrictMagicMime(buffer);
  const allowedImageMagics = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
    "image/heic",
  ]);
  if (!magicMime || !allowedImageMagics.has(magicMime)) {
    return {
      valid: false,
      error: "Signature biner file bukan format gambar asli (hanya JPG, PNG, WebP, GIF, AVIF yang diizinkan).",
    };
  }

  // 3. Decode image header & pixel structure using Sharp to reject corrupted or fake images
  try {
    const sharpModule = await import("sharp");
    const sharp = sharpModule.default || sharpModule;
    const metadata = await sharp(buffer, { failOn: "error" }).metadata();

    if (!metadata || !metadata.width || !metadata.height || !metadata.format) {
      return { valid: false, error: "File gambar rusak atau tidak memiliki dimensi piksel yang valid." };
    }

    const maxW = options?.maxWidth || 12000;
    const maxH = options?.maxHeight || 12000;
    if (metadata.width < 1 || metadata.height < 1 || metadata.width > maxW || metadata.height > maxH) {
      return {
        valid: false,
        error: `Dimensi gambar tidak wajar (${metadata.width}x${metadata.height}). Maksimal ${maxW}x${maxH}px.`,
      };
    }

    return {
      valid: true,
      format: metadata.format,
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    return {
      valid: false,
      error: "File gambar gagal diverifikasi (file korup, rusak, atau bukan gambar asli).",
    };
  }
}

