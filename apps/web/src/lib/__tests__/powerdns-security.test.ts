import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    setting: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

import {
  formatDisplayRecordName,
  isReservedPlatformDomain,
  isValidDomain,
  normalizeDomain,
  parseDsRecordString,
  toRecordFqdn,
  validateAndFormatRecordContent,
} from "../powerdns";

describe("PowerDNS Validation & Security Guards", () => {
  it("normalizes domains and blocks public suffixes", () => {
    expect(normalizeDomain("  Example.COM.  ")).toBe("example.com");
    expect(isValidDomain("example.com")).toBe(true);
    expect(isValidDomain("sub.example.co.id")).toBe(true);
    expect(isValidDomain("co.id")).toBe(false);
    expect(isValidDomain("my.id")).toBe(false);
    expect(isValidDomain("github.io")).toBe(false);
    expect(isValidDomain("localhost")).toBe(false);
  });

  it("blocks reserved platform domains", async () => {
    expect(await isReservedPlatformDomain("masdika.id")).toBe(true);
    expect(await isReservedPlatformDomain("evil.masdika.id")).toBe(true);
    expect(await isReservedPlatformDomain("masdikacloud.my.id")).toBe(true);
    expect(await isReservedPlatformDomain("customer-site.com")).toBe(false);
  });

  it("formats record FQDNs and display names safely", () => {
    expect(toRecordFqdn("@", "example.com")).toBe("example.com.");
    expect(toRecordFqdn("www", "example.com")).toBe("www.example.com.");
    expect(toRecordFqdn("api.v1", "example.com")).toBe("api.v1.example.com.");
    expect(toRecordFqdn("*.cdn", "example.com")).toBe("*.cdn.example.com.");
    expect(() => toRecordFqdn("bad host!", "example.com")).toThrow();

    expect(formatDisplayRecordName("example.com.", "example.com")).toBe("@");
    expect(formatDisplayRecordName("www.example.com.", "example.com")).toBe("www");
  });

  it("validates and formats A, AAAA, CNAME, MX, TXT, SRV, and CAA records", () => {
    expect(validateAndFormatRecordContent("A", "103.247.10.61")).toBe("103.247.10.61");
    expect(() => validateAndFormatRecordContent("A", "999.1.1.1")).toThrow();

    expect(validateAndFormatRecordContent("AAAA", "2001:db8::1")).toBe("2001:db8::1");
    expect(() => validateAndFormatRecordContent("AAAA", "not-ipv6")).toThrow();

    expect(validateAndFormatRecordContent("CNAME", "app.example.com")).toBe("app.example.com.");
    expect(validateAndFormatRecordContent("MX", "mail.example.com", 10)).toBe("10 mail.example.com.");
    expect(validateAndFormatRecordContent("MX", "20 mx2.example.com")).toBe("20 mx2.example.com.");

    expect(validateAndFormatRecordContent("TXT", "v=spf1 ~all")).toBe('"v=spf1 ~all"');
    expect(() => validateAndFormatRecordContent("TXT", "line1\nline2")).toThrow();
    expect(() => validateAndFormatRecordContent("TXT", "a".repeat(256))).toThrow();

    expect(validateAndFormatRecordContent("SRV", "10 5 5060 sip.example.com")).toBe(
      "10 5 5060 sip.example.com."
    );
    expect(validateAndFormatRecordContent("CAA", '0 issue "letsencrypt.org"')).toBe(
      '0 issue "letsencrypt.org"'
    );
  });

  it("parses PowerDNS DS record strings cleanly", () => {
    const parsed = parseDsRecordString("12345 13 2 ABCDEF0123456789");
    expect(parsed).toEqual({
      keyTag: "12345",
      algorithm: "13",
      digestType: "2",
      digest: "ABCDEF0123456789",
      raw: "12345 13 2 ABCDEF0123456789",
    });
    expect(parseDsRecordString("invalid")).toBeNull();
  });
});
