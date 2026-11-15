import { describe, expect, it } from 'vitest';
import { getInvoiceDisplayInfo } from '../invoice-display';

describe('getInvoiceDisplayInfo', () => {
  it('formats Object Storage invoice with package size and instance name', () => {
    const info = getInvoiceDisplayInfo({
      type: 'OBJECT_STORAGE',
      reference: 'PAYG_RUNNING',
      details: JSON.stringify({
        objectStorageServiceId: 5,
        name: 'ono-test',
        planName: '1 GB',
        storageGb: 1,
        billingMode: 'PAYG',
      }),
    });

    expect(info.title).toContain('Object Storage');
    expect(info.title).toContain('1 GB');
    expect(info.title).toContain('ono-test');
    expect(info.subtitle).toBe('Pay-As-You-Go');
    expect(info.specs.some((s) => s.label === '1 GB Object Storage')).toBe(true);
  });

  it('formats Managed App invoice with app name, plan, and specs', () => {
    const info = getInvoiceDisplayInfo({
      type: 'MANAGED_APP',
      reference: 'PAYG_RUNNING',
      details: JSON.stringify({
        appServiceId: 12,
        name: 'ninerouter',
        appType: 'ninerouter',
        appName: '9Router',
        planName: 'starter',
        cpuShares: 0.5,
        memoryMb: 512,
        storageGb: 5,
        billingMode: 'PAYG',
      }),
    });

    expect(info.title).toContain('Managed App');
    expect(info.title).toContain('9Router');
    expect(info.title).toContain('starter');
    expect(info.specs.map((s) => s.label)).toContain('512 MB RAM');
  });

  it('formats Managed Database invoice with engine, version, plan, and specs', () => {
    const info = getInvoiceDisplayInfo({
      type: 'MANAGED_DATABASE',
      reference: 'MONTHLY_PAID',
      details: JSON.stringify({
        databaseServiceId: 8,
        name: 'prod-pg',
        dbType: 'POSTGRESQL',
        version: '16',
        planName: 'Starter 1 GB',
        cpuShares: 1,
        memoryMb: 1024,
        storageGb: 10,
        billingMode: 'MONTHLY',
      }),
    });

    expect(info.title).toContain('Managed Database');
    expect(info.title).toContain('POSTGRESQL v16');
    expect(info.title).toContain('Starter 1 GB');
    expect(info.subtitle).toBe('Monthly Plan');
    expect(info.specs.map((s) => s.label)).toContain('1 GB RAM');
  });

  it('formats File CDN subscription invoice cleanly', () => {
    const info = getInvoiceDisplayInfo({
      type: 'SUBSCRIPTION',
      reference: 'PAYG_RUNNING',
      subscription: {
        plan: {
          service: 'CDN',
          name: '1 GB',
          description: 'File CDN 1 GB high-speed edge storage',
        },
      },
    });

    expect(info.title).toBe('File CDN • 1 GB');
    expect(info.description).toContain('File CDN 1 GB');
    expect(info.specs.map((s) => s.label)).toContain('1 GB Plan');
  });

  it('formats Promo Reward invoice cleanly', () => {
    const info = getInvoiceDisplayInfo({
      invoiceNumber: 'RWD-123456',
      paymentMethod: 'REWARD',
      details: JSON.stringify({ description: 'Reward claim for promo: Bonus Saldo' }),
    });

    expect(info.category).toBe('REWARD');
    expect(info.title).toBe('Promo Reward Credit');
    expect(info.subtitle).toContain('Bonus Saldo');
  });
});
