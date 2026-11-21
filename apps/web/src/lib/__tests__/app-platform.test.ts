import { describe, it, expect, vi, beforeEach } from 'vitest';
import { generateDockerfileForFramework } from '../k8s-app-platform';
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

  describe('Automated Dockerfile Generator', () => {
    it('generates production Laravel Apache Dockerfile with mod_rewrite & public docroot', () => {
      const df = generateDockerfileForFramework('LARAVEL', null, null, 80);
      expect(df).toContain('FROM php:8.3-apache');
      expect(df).toContain('composer install');
      expect(df).toContain('a2enmod rewrite');
      expect(df).toContain('/var/www/html/public');
      expect(df).toContain('EXPOSE 80');
    });

    it('generates production Node.js Dockerfile with custom commands', () => {
      const df = generateDockerfileForFramework('NODEJS', 'npm run build:prod', 'node dist/main.js', 3000);
      expect(df).toContain('FROM node:20-alpine');
      expect(df).toContain('npm run build:prod');
      expect(df).toContain('node dist/main.js');
      expect(df).toContain('EXPOSE 3000');
    });

    it('generates production Python Dockerfile', () => {
      const df = generateDockerfileForFramework('PYTHON', null, 'uvicorn main:app --host 0.0.0.0 --port 8000', 8000);
      expect(df).toContain('FROM python:3.11');
      expect(df).toContain('pip install');
      expect(df).toContain('uvicorn main:app');
      expect(df).toContain('EXPOSE 8000');
    });

    it('generates multi-stage Go build Dockerfile', () => {
      const df = generateDockerfileForFramework('GOLANG', null, null, 8080);
      expect(df).toContain('FROM golang:1.22-alpine AS builder');
      expect(df).toContain('FROM alpine:latest');
      expect(df).toContain('EXPOSE 8080');
    });

    it('generates PHP Apache Dockerfile with docker-php-ext-install for Kaniko compatibility', () => {
      const df = generateDockerfileForFramework('PHP', null, null, 80);
      expect(df).toContain('FROM php:8.3-apache');
      expect(df).toContain('docker-php-ext-install');
      expect(df).toContain('getcomposer.org');
      expect(df).toContain('EXPOSE 80');
    });

    it('generates Vite SPA Dockerfile with Nginx fallback routing', () => {
      const df = generateDockerfileForFramework('VITE', 'npm run build', null, 80);
      expect(df).toContain('FROM node:20-alpine AS builder');
      expect(df).toContain('FROM nginx:alpine');
      expect(df).toContain('try_files $uri $uri/ /index.html');
      expect(df).toContain('EXPOSE 80');
    });

    it('generates WordPress Apache Dockerfile', () => {
      const df = generateDockerfileForFramework('WORDPRESS', null, null, 80);
      expect(df).toContain('FROM wordpress:php8.3-apache');
      expect(df).toContain('EXPOSE 80');
    });

    it('hardens PHP, Laravel, and WordPress Dockerfiles against PHP CVEs, debug leaks, and webshells', () => {
      const laravelDf = generateDockerfileForFramework('LARAVEL', null, null, 80);
      const phpDf = generateDockerfileForFramework('PHP', null, null, 80);
      const wpDf = generateDockerfileForFramework('WORDPRESS', null, null, 80);

      for (const df of [laravelDf, phpDf, wpDf]) {
        expect(df).toContain('php.ini-production');
        expect(df).toContain('expose_php = Off');
        expect(df).toContain('cgi.fix_pathinfo = 0');
        expect(df).toContain('allow_url_include = Off');
        expect(df).toContain('ServerTokens Prod');
        expect(df).toContain('X-Content-Type-Options');
        expect(df).toContain('php_admin_flag engine off');
      }

      expect(laravelDf).toContain('APP_DEBUG=false');
      expect(laravelDf).toContain('APP_ENV=production');
    });

    it('generates Static Nginx Dockerfile', () => {
      const df = generateDockerfileForFramework('STATIC', 'npm run build', null, 80);
      expect(df).toContain('FROM nginx:alpine');
      expect(df).toContain('EXPOSE 80');
    });

    it('returns empty string for native DOCKERFILE buildType', () => {
      const df = generateDockerfileForFramework('DOCKERFILE');
      expect(df).toBe('');
    });

    it('never uses apt-get in any generated framework Dockerfile to prevent Kaniko libc-bin permission errors', () => {
      const frameworks = [
        'LARAVEL',
        'PHP',
        'WORDPRESS',
        'NODEJS',
        'NEXTJS',
        'NESTJS',
        'REMIX',
        'SVELTE',
        'ASTRO',
        'PYTHON',
        'FASTAPI',
        'DJANGO',
        'GOLANG',
        'RUST',
        'RUBY',
        'RAILS',
        'JAVA',
        'VITE',
        'STATIC',
      ];
      for (const fw of frameworks) {
        const df = generateDockerfileForFramework(fw, null, null, 8080);
        expect(df.toLowerCase()).not.toContain('apt-get');
      }
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
          buildType: 'NODEJS',
          planName: '1C1G',
          cpuShares: 1.0,
          memoryMb: 1024,
          storageGb: 10,
        }),
      });

      expect(info.category).toBe('APP_PLATFORM');
      expect(info.title).toContain('App Platform • NODEJS (1C1G) - portfolio-web');
      expect(info.subtitle).toBe('Pay-As-You-Go');
      expect(info.specs.some(s => s.kind === 'cpu' && s.label === '1 vCPU')).toBe(true);
      expect(info.specs.some(s => s.kind === 'ram' && s.label === '1 GB RAM')).toBe(true);
      expect(info.specs.some(s => s.kind === 'disk' && s.label === '10 GB SSD')).toBe(true);
    });
  });
});
