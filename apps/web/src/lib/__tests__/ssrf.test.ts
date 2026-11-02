import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import dns from 'dns';
import { isPrivateIp, validateSafeUrl } from '../ssrf';

describe('SSRF Protection - isPrivateIp()', () => {
  it('should detect IPv4 loopback addresses as private', () => {
    expect(isPrivateIp('127.0.0.1')).toBe(true);
    expect(isPrivateIp('127.0.1.1')).toBe(true);
    expect(isPrivateIp('127.255.255.255')).toBe(true);
  });

  it('should detect RFC 1918 private IPv4 ranges', () => {
    // 10.0.0.0/8
    expect(isPrivateIp('10.0.0.1')).toBe(true);
    expect(isPrivateIp('10.42.0.1')).toBe(true);
    expect(isPrivateIp('10.255.255.255')).toBe(true);

    // 172.16.0.0/12
    expect(isPrivateIp('172.16.0.1')).toBe(true);
    expect(isPrivateIp('172.24.1.10')).toBe(true);
    expect(isPrivateIp('172.31.255.255')).toBe(true);
    // 172.32.0.1 is public
    expect(isPrivateIp('172.32.0.1')).toBe(false);

    // 192.168.0.0/16
    expect(isPrivateIp('192.168.0.1')).toBe(true);
    expect(isPrivateIp('192.168.79.4')).toBe(true);
    expect(isPrivateIp('192.168.79.10')).toBe(true);
    expect(isPrivateIp('192.168.255.255')).toBe(true);
  });

  it('should block AWS / Cloud Provider Metadata endpoints (169.254.169.254)', () => {
    expect(isPrivateIp('169.254.169.254')).toBe(true);
    expect(isPrivateIp('169.254.0.1')).toBe(true);
  });

  it('should block current network and broadcast addresses', () => {
    expect(isPrivateIp('0.0.0.0')).toBe(true);
    expect(isPrivateIp('255.255.255.255')).toBe(true);
  });

  it('should block IPv6 loopback and private/link-local addresses', () => {
    expect(isPrivateIp('::1')).toBe(true);
    expect(isPrivateIp('::')).toBe(true);
    expect(isPrivateIp('fc00::1')).toBe(true);
    expect(isPrivateIp('fd12:3456:789a::1')).toBe(true);
    expect(isPrivateIp('fe80::1')).toBe(true);
  });

  it('should allow valid public IP addresses', () => {
    expect(isPrivateIp('8.8.8.8')).toBe(false);
    expect(isPrivateIp('1.1.1.1')).toBe(false);
    expect(isPrivateIp('142.250.190.46')).toBe(false);
    expect(isPrivateIp('104.21.48.1')).toBe(false);
  });
});

describe('SSRF Protection - validateSafeUrl()', () => {
  beforeEach(() => {
    // Default DNS mock resolves to a legitimate public IP
    vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
      { address: '185.199.108.133', family: 4 },
    ] as any);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should reject prohibited protocols (file, ftp, gopher)', async () => {
    const fileResult = await validateSafeUrl('file:///etc/passwd');
    expect(fileResult.safe).toBe(false);
    expect(fileResult.reason).toContain('Protocol');

    const ftpResult = await validateSafeUrl('ftp://example.com/file.txt');
    expect(ftpResult.safe).toBe(false);

    const gopherResult = await validateSafeUrl('gopher://example.com');
    expect(gopherResult.safe).toBe(false);
  });

  it('should reject local hostnames (localhost, internal, lan)', async () => {
    const res1 = await validateSafeUrl('https://localhost:443');
    expect(res1.safe).toBe(false);
    expect(res1.reason).toContain('local/internal');

    const res2 = await validateSafeUrl('https://app.internal:443');
    expect(res2.safe).toBe(false);

    const res3 = await validateSafeUrl('https://server.local:443');
    expect(res3.safe).toBe(false);
  });

  it('should reject non-standard/unauthorized ports', async () => {
    // SSH port 22
    const res1 = await validateSafeUrl('https://example.com:22');
    expect(res1.safe).toBe(false);
    expect(res1.reason).toContain('Port');

    // MySQL port 3306
    const res2 = await validateSafeUrl('https://example.com:3306');
    expect(res2.safe).toBe(false);
  });

  it('should reject direct private IP literals in URL', async () => {
    const res1 = await validateSafeUrl('https://127.0.0.1:443');
    expect(res1.safe).toBe(false);

    const res2 = await validateSafeUrl('https://169.254.169.254:443');
    expect(res2.safe).toBe(false);

    const res3 = await validateSafeUrl('https://192.168.1.1:443');
    expect(res3.safe).toBe(false);
  });

  it('should validate domain whitelist when options are provided', async () => {
    const options = {
      allowedProtocols: ['https:'],
      allowedDomains: ['github.com', 'gravatar.com'],
    };

    const resValid = await validateSafeUrl('https://avatars.github.com/u/12345', options);
    expect(resValid.safe).toBe(true);

    const resBlocked = await validateSafeUrl('https://attacker-evil.com/image.png', options);
    expect(resBlocked.safe).toBe(false);
    expect(resBlocked.reason).toContain('whitelist');
  });

  it('should defend against DNS Rebinding attacks (domain pointing to internal IP)', async () => {
    // Simulate DNS Rebinding: domain looks harmless (rebind.evil.com) but resolves to 127.0.0.1 or 10.42.0.1
    vi.spyOn(dns.promises, 'lookup').mockResolvedValue([
      { address: '127.0.0.1', family: 4 },
    ] as any);

    const resRebind = await validateSafeUrl('https://rebind.evil.com/secret');
    expect(resRebind.safe).toBe(false);
    expect(resRebind.reason).toContain('restricted private IP');
  });

  it('should reject malformed or invalid URLs', async () => {
    const res = await validateSafeUrl('not-a-valid-url');
    expect(res.safe).toBe(false);
    expect(res.reason).toContain('Malformed URL');
  });
});
