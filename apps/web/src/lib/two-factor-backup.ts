import crypto from "crypto";

const BACKUP_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/**
 * Generates one-time 2FA backup codes formatted as XXXX-XXXX.
 */
export function generateBackupCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    const bytes = crypto.randomBytes(8);
    let raw = "";
    for (let j = 0; j < 8; j++) {
      raw += BACKUP_ALPHABET[bytes[j] % BACKUP_ALPHABET.length];
    }
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

/**
 * Normalizes a backup code input (strips dashes/spaces and uppercases).
 */
export function normalizeBackupCode(input: string): string {
  return String(input || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

/**
 * Returns true if the input matches an 8-character backup code (with or without hyphen).
 */
export function isBackupCodeFormat(input: string): boolean {
  const normalized = normalizeBackupCode(input);
  return /^[A-Z0-9]{8}$/.test(normalized);
}

/**
 * Hashes a backup code with SHA-256 for safe database storage.
 */
export function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(normalizeBackupCode(code)).digest("hex");
}

/**
 * Verifies a backup code against stored SHA-256 hashes in constant time
 * and returns remaining hashes with the consumed code removed.
 */
export function verifyAndConsumeBackupCode(
  storedHashes: string[] | null | undefined,
  rawInput: string
): { valid: boolean; remainingHashes: string[] } {
  if (!Array.isArray(storedHashes) || storedHashes.length === 0 || !isBackupCodeFormat(rawInput)) {
    return { valid: false, remainingHashes: storedHashes || [] };
  }

  const candidateBuf = Buffer.from(hashBackupCode(rawInput), "utf8");
  let matchedIndex = -1;

  for (let i = 0; i < storedHashes.length; i++) {
    const hash = storedHashes[i];
    if (typeof hash !== "string" || hash.length !== candidateBuf.length) continue;
    if (crypto.timingSafeEqual(Buffer.from(hash, "utf8"), candidateBuf)) {
      matchedIndex = i;
    }
  }

  if (matchedIndex === -1) {
    return { valid: false, remainingHashes: storedHashes };
  }

  const remainingHashes = storedHashes.filter((_, idx) => idx !== matchedIndex);
  return { valid: true, remainingHashes };
}

/**
 * Formats a downloadable WHMCS-style plain-text backup file for 2FA recovery codes.
 */
export function formatBackupCodesFileContent(email: string, codes: string[]): string {
  const generatedAt = new Date().toISOString();
  return [
    "============================================================",
    "  MASDIKA CLOUD - TWO-FACTOR AUTHENTICATION BACKUP CODES",
    "============================================================",
    `Account   : ${email}`,
    `Generated : ${generatedAt}`,
    "",
    "IMPORTANT:",
    "- Keep these recovery codes in a safe, offline location.",
    "- Each code can only be used ONCE to sign in if you lose",
    "  access to your authenticator app.",
    "- Regenerating backup codes invalidates all previous codes.",
    "",
    "RECOVERY CODES:",
    ...codes.map((c, idx) => `  ${String(idx + 1).padStart(2, "0")}. ${c}`),
    "",
    "============================================================",
    "",
  ].join("\n");
}
