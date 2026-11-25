import { describe, it, expect } from 'vitest';
import {
  parseEnvVarsToK8sEnv,
  validateExternalDockerImage,
  isDirectImageApp,
  resolveAppPlatformContainerImage,
} from '../k8s-app-platform';
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

  describe('Direct Docker Registry Validation & Multi-Tenant Security', () => {
    it('accepts valid public and custom OCI registry image references', () => {
      expect(validateExternalDockerImage('nginx:alpine')).toEqual({
        valid: true,
        normalized: 'nginx:alpine',
        registryServer: 'https://index.docker.io/v1/',
        isDockerHub: true,
      });

      expect(validateExternalDockerImage('docker://ghcr.io/masdika/api-service:v1.2.3')).toEqual({
        valid: true,
        normalized: 'ghcr.io/masdika/api-service:v1.2.3',
        registryServer: 'ghcr.io',
        isDockerHub: false,
      });

      const digestRef = 'registry.gitlab.com/group/sub/app@sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      expect(validateExternalDockerImage(digestRef)).toEqual({
        valid: true,
        normalized: digestRef,
        registryServer: 'registry.gitlab.com',
        isDockerHub: false,
      });
    });

    it('blocks internal cluster registry, loopback, RFC1918 IPs, and invalid URLs', () => {
      expect(validateExternalDockerImage('127.0.0.1:5000/other-tenant:latest').valid).toBe(false);
      expect(validateExternalDockerImage('localhost:5000/secret-app:v1').valid).toBe(false);
      expect(validateExternalDockerImage('192.168.79.20:5000/app:latest').valid).toBe(false);
      expect(validateExternalDockerImage('10.0.0.12/internal:latest').valid).toBe(false);
      expect(validateExternalDockerImage('172.16.5.4/internal:latest').valid).toBe(false);
      expect(validateExternalDockerImage('registry.app-platform.svc.cluster.local/app:1').valid).toBe(false);
      expect(validateExternalDockerImage('https://hub.docker.com/_/nginx').valid).toBe(false);
      expect(validateExternalDockerImage('nginx:alpine; rm -rf /').valid).toBe(false);
    });

    it('resolves container image accurately for both Direct Registry and BuildKit apps', () => {
      const directApp: any = {
        id: 1,
        subdomain: 'demo-reg',
        buildMode: 'IMAGE',
        buildType: 'IMAGE',
        dockerImage: 'ghcr.io/org/web:1.0.0',
        gitUrl: 'docker://ghcr.io/org/web:1.0.0',
      };
      expect(isDirectImageApp(directApp)).toBe(true);
      expect(resolveAppPlatformContainerImage(directApp, 'latest')).toBe('ghcr.io/org/web:1.0.0');
      expect(resolveAppPlatformContainerImage(directApp, 'ghcr.io/org/web:0.9.0')).toBe('ghcr.io/org/web:0.9.0');

      const gitApp: any = {
        id: 2,
        subdomain: 'demo-git',
        buildMode: 'DOCKERFILE',
        buildType: 'DOCKERFILE',
        gitUrl: 'https://github.com/laravel/laravel.git',
      };
      expect(isDirectImageApp(gitApp)).toBe(false);
      expect(resolveAppPlatformContainerImage(gitApp, 'b12345')).toBe('127.0.0.1:5000/demo-git:b12345');
    });
  });
});
