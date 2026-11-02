import { describe, it, expect } from 'vitest';
import { formatRupiah, formatCompactRupiah, getCycleText } from '../billing';
import { getComputeRate, getStoppedRate, getEffectiveHourlyRate, VpsRateInput } from '../vps-billing-rate';

describe('Billing Formatting - billing.ts', () => {
  it('should format numbers into Indonesian Rupiah currency format', () => {
    const formatted = formatRupiah(150000);
    // Replace non-breaking spaces if present in locale
    expect(formatted.replace(/\s+/g, ' ')).toMatch(/Rp\s?150\.000/);
  });

  it('should format compact currency for millions and billions', () => {
    expect(formatCompactRupiah(1_500_000)).toBe('Rp 1,5 jt');
    expect(formatCompactRupiah(10_000_000)).toBe('Rp 10 jt');
    expect(formatCompactRupiah(2_500_000_000)).toBe('Rp 2,5 M');
    expect(formatCompactRupiah(10_000_000_000)).toBe('Rp 10 M');
  });

  it('should return Pay-As-You-Go for getCycleText()', () => {
    expect(getCycleText()).toBe('Pay-As-You-Go');
  });
});

describe('PAYG VPS Hourly Rate Calculation - vps-billing-rate.ts', () => {
  const mockPricing = {
    vcpu: 100, // Rp 100 per core/hour
    ram: 50,   // Rp 50 per GB/hour
  };

  it('should compute pure CPU and RAM compute rate', () => {
    const vps = { cpuCores: 2, ramGb: 4 };
    // 2 * 100 + 4 * 50 = 200 + 200 = 400
    expect(getComputeRate(vps, mockPricing)).toBe(400);
  });

  it('should compute stopped rate with storage ceiling (prevent overcharging stopped VPS)', () => {
    const vps: VpsRateInput = {
      status: 'STOPPED',
      hourlyRate: 500, // Total = 400 compute + 100 disk
      stoppedRate: 150, // Drifted or misconfigured
      cpuCores: 2,
      ramGb: 4,
    };

    // Storage ceiling = max(0, 500 - 400) = 100
    // stoppedRate should be min(150, 100) = 100
    expect(getStoppedRate(vps, mockPricing)).toBe(100);
  });

  it('should return full hourlyRate when VPS is RUNNING', () => {
    const vps: VpsRateInput = {
      status: 'RUNNING',
      hourlyRate: 500,
      stoppedRate: 100,
      cpuCores: 2,
      ramGb: 4,
    };

    expect(getEffectiveHourlyRate(vps, mockPricing)).toBe(500);
  });

  it('should return stopped rate when VPS is STOPPED', () => {
    const vps: VpsRateInput = {
      status: 'STOPPED',
      hourlyRate: 500,
      stoppedRate: 100,
      cpuCores: 2,
      ramGb: 4,
    };

    expect(getEffectiveHourlyRate(vps, mockPricing)).toBe(100);
  });

  it('should return 0 when VPS status is TERMINATED or SUSPENDED', () => {
    const vpsTerminated: VpsRateInput = {
      status: 'TERMINATED',
      hourlyRate: 500,
      stoppedRate: 100,
      cpuCores: 2,
      ramGb: 4,
    };
    expect(getEffectiveHourlyRate(vpsTerminated, mockPricing)).toBe(0);

    const vpsSuspended: VpsRateInput = {
      status: 'SUSPENDED',
      hourlyRate: 500,
      stoppedRate: 100,
      cpuCores: 2,
      ramGb: 4,
    };
    expect(getEffectiveHourlyRate(vpsSuspended, mockPricing)).toBe(0);
  });
});

