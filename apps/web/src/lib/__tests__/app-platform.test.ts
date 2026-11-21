import { describe, it, expect } from 'vitest';
import { parseEnvVarsToK8sEnv } from '../k8s-app-platform';
import { APP_PLATFORM_PLANS, getAppPlatformPlan } from '../app-platform-plans';
import { getInvoiceDisplayInfo } from '../invoice-display';

describe('App Platform Engine & Capabilities', () => {
  describe('Plans & Pricing Specifications', () => {
    it('defines 7 standard plans matching Managed App specs & pricing', () => {
      expect(APP_PLATFORM_PLANS.length).toBe(7);
      const plan1c1g = getAppPlatformPlan('1C1G');
      expect(plan1c1g.cpuShares).toBe(1.0);
      expect(plan1c1g.memoryMb).toBe(1024);
      expect(plan1c1g.storageGb).toBe(10);
      expect(plan1c1g.diskLabel).toBe('10 GB SSD');
      expect(plan1c1g.monthlyPrice).toBe(20000);
      expect(plan1c1g.hourlyRate).toBe(28);

      const plan1c2g = getAppPlatformPlan('1C2G');
      expect(plan1c2g.cpuShares).toBe(1.0);
      expect(plan1c2g.memoryMb).toBe(2048);
      expect(plan1c2g.storageGb).toBe(10);
      expect(plan1c2g.diskLabel).toBe('10 GB SSD');
      expect(plan1c2g.monthlyPrice).toBe(30000);
      expect(plan1c2g.hourlyRate).toBe(42);
      expect(plan1c2g.popular).toBe(true);

      const plan4c16g = getAppPlatformPlan('4C16G');
      expect(plan4c16g.cpuShares).toBe(4.0);
      expect(plan4c16g.memoryMb).toBe(16384);
      expect(plan4c16g.monthlyPrice).toBe(375000);
    });

    it('falls back to 1C2G popular plan when invalid planCode is supplied', () => {
      const fallback = getAppPlatformPlan('UNKNOWN_PLAN');
      expect(fallback.planCode).toBe('1C2G');
    });
  });

  describe('Environment Variables Parser', () => {
    it('parses KEY=VALUE lines with quotes, export prefix, CRLF, comments, and = inside values', () => {
      const raw = [
        '# Database config',
        'APP_ENV=production\r',
        'export APP_NAME="Masdika Cloud"\r',
        "JWT_SECRET='super-secret-key'",
        'APP_KEY=base64:abc123==',
        'CALLBACK_URL=https://api.example.com/hook?sig=xyz=1',
        'APP_ENV=staging',
        'INVALID-KEY=ignored',
      ].join('\n');

      const parsed = parseEnvVarsToK8sEnv(raw);
      expect(parsed).toEqual([
        { name: 'APP_ENV', value: 'staging' },
        { name: 'APP_NAME', value: 'Masdika Cloud' },
        { name: 'JWT_SECRET', value: 'super-secret-key' },
        { name: 'APP_KEY', value: 'base64:abc123==' },
        { name: 'CALLBACK_URL', value: 'https://api.example.com/hook?sig=xyz=1' },
      ]);
    });

    it('parses JSON object envVars cleanly', () => {
      const parsed = parseEnvVarsToK8sEnv(JSON.stringify({ PORT: 8080, DEBUG: false, EMPTY: '' }));
      expect(parsed).toEqual([
        { name: 'PORT', value: '8080' },
        { name: 'DEBUG', value: 'false' },
        { name: 'EMPTY', value: '' },
      ]);
    });
  });

  describe('Invoice & Unified Billing Display', () => {
    it('formats APP_PLATFORM invoice display with badges and metadata', () => {
      const info = getInvoiceDisplayInfo({
        invoiceNumber: 'INV-PAYG-12345',
        type: 'APP_PLATFORM',
        amount: 25000,
        status: 'PAID',
        reference: 'PAYG_RUNNING',
        details: JSON.stringify({
          appPlatformServiceId: 10,
          name: 'portfolio-web',
          buildType: 'DOCKERFILE',
          planName: '1C1G',
          cpuShares: 1.0,
          memoryMb: 1024,
          storageGb: 10,
        }),
      });

      expect(info.category).toBe('APP_PLATFORM');
      expect(info.title).toContain('App Platform • DOCKERFILE (1C1G) - portfolio-web');
      expect(info.subtitle).toBe('Pay-As-You-Go');
      expect(info.specs.some(s => s.kind === 'cpu' && s.label === '1 vCPU')).toBe(true);
      expect(info.specs.some(s => s.kind === 'ram' && s.label === '1 GB RAM')).toBe(true);
      expect(info.specs.some(s => s.kind === 'disk' && s.label === '10 GB SSD')).toBe(true);
    });
  });
});
