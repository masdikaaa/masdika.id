export interface OfficialCdnPlan {
  name: string;
  service: 'CDN';
  description: string;
  price: number;
  hourlyPrice: number;
  limits: {
    storage: string;
    storageGb: number;
    bandwidth: string;
    region: string;
  };
  isActive: boolean;
  isPopular: boolean;
}

export const OFFICIAL_CDN_PLANS: OfficialCdnPlan[] = [
  {
    name: 'CDN Micro 1 GB',
    service: 'CDN',
    description: 'Entry File CDN space with 1 GB SSD quota, instant edge links & dedicated REST API keys.',
    price: 5000,
    hourlyPrice: 7,
    limits: {
      storage: '1 GB',
      storageGb: 1,
      bandwidth: 'Unmetered Edge Bandwidth',
      region: 'Sidoarjo',
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'CDN Starter 5 GB',
    service: 'CDN',
    description: 'Compact 5 GB File CDN for personal apps, avatars, static assets & lightweight media.',
    price: 15000,
    hourlyPrice: 21,
    limits: {
      storage: '5 GB',
      storageGb: 5,
      bandwidth: 'Unmetered Edge Bandwidth',
      region: 'Sidoarjo',
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'CDN Basic 10 GB',
    service: 'CDN',
    description: 'Popular 10 GB File CDN with folder hierarchy, public/private ACLs & REST API upload.',
    price: 25000,
    hourlyPrice: 35,
    limits: {
      storage: '10 GB',
      storageGb: 10,
      bandwidth: 'Unmetered Edge Bandwidth',
      region: 'Sidoarjo',
    },
    isActive: true,
    isPopular: true,
  },
  {
    name: 'CDN Standard 25 GB',
    service: 'CDN',
    description: 'Ideal for production web apps & media delivery with 25 GB File CDN quota and unmetered bandwidth.',
    price: 55000,
    hourlyPrice: 76,
    limits: {
      storage: '25 GB',
      storageGb: 25,
      bandwidth: 'Unmetered Edge Bandwidth',
      region: 'Sidoarjo',
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'CDN Pro 50 GB',
    service: 'CDN',
    description: 'High-capacity 50 GB File CDN for growing workloads, media libraries & automated CI uploads.',
    price: 100000,
    hourlyPrice: 137,
    limits: {
      storage: '50 GB',
      storageGb: 50,
      bandwidth: 'Unmetered Edge Bandwidth',
      region: 'Sidoarjo',
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'CDN Business 100 GB',
    service: 'CDN',
    description: '100 GB enterprise-grade File CDN cluster with priority edge delivery & dedicated REST API keys.',
    price: 200000,
    hourlyPrice: 274,
    limits: {
      storage: '100 GB',
      storageGb: 100,
      bandwidth: 'Unmetered Edge Bandwidth',
      region: 'Sidoarjo',
    },
    isActive: true,
    isPopular: false,
  },
];
