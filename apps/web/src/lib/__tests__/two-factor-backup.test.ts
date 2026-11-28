import { describe, expect, it } from "vitest";
import {
  formatBackupCodesFileContent,
  generateBackupCodes,
  hashBackupCode,
  isBackupCodeFormat,
  verifyAndConsumeBackupCode,
} from "../two-factor-backup";

describe("2FA Backup Codes", () => {
  it("generates 8 unique XXXX-XXXX backup codes", () => {
    const codes = generateBackupCodes(8);
    expect(codes).toHaveLength(8);
    expect(new Set(codes).size).toBe(8);
    for (const c of codes) {
      expect(c).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
      expect(isBackupCodeFormat(c)).toBe(true);
    }
  });

  it("normalizes case and hyphens when hashing", () => {
    expect(hashBackupCode("ab23-cd45")).toBe(hashBackupCode("AB23CD45"));
    expect(hashBackupCode(" ab23 cd45 ")).toBe(hashBackupCode("AB23-CD45"));
  });

  it("consumes a valid backup code once and rejects reuse", () => {
    const codes = generateBackupCodes(4);
    const hashes = codes.map(hashBackupCode);

    const first = verifyAndConsumeBackupCode(hashes, codes[1].toLowerCase().replace("-", ""));
    expect(first.valid).toBe(true);
    expect(first.remainingHashes).toHaveLength(3);

    const replay = verifyAndConsumeBackupCode(first.remainingHashes, codes[1]);
    expect(replay.valid).toBe(false);
    expect(replay.remainingHashes).toHaveLength(3);
  });

  it("rejects invalid or malformed codes without mutating stored hashes", () => {
    const codes = generateBackupCodes(3);
    const hashes = codes.map(hashBackupCode);

    expect(verifyAndConsumeBackupCode(hashes, "123456").valid).toBe(false);
    expect(verifyAndConsumeBackupCode(hashes, "ZZZZ-ZZZZ").valid).toBe(false);
    expect(verifyAndConsumeBackupCode(hashes, "ZZZZ-ZZZZ").remainingHashes).toHaveLength(3);
  });

  it("formats downloadable backup file cleanly", () => {
    const txt = formatBackupCodesFileContent("user@example.com", ["ABCD-2345", "EFGH-6789"]);
    expect(txt).toContain("user@example.com");
    expect(txt).toContain("01. ABCD-2345");
    expect(txt).toContain("02. EFGH-6789");
  });
});
