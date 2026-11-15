export interface OfficialObjectStoragePlan {
  name: string;
  service: 'OBJECT_STORAGE';
  description: string;
  price: number;
  hourlyPrice: number;
  limits: {
    storage: string;
    storageGb: number;
    region: string;
    maxBuckets: number;
    maxKeys: number;
  };
  isActive: boolean;
  isPopular: boolean;
}

export const OFFICIAL_OBJECT_STORAGE_PLANS: OfficialObjectStoragePlan[] = [
  {
    name: 'S3 Micro 1 GB',
    service: 'OBJECT_STORAGE',
    description: 'Entry S3-compatible object storage with 1 GB quota, isolated bucket & custom IAM Access Keys.',
    price: 5000,
    hourlyPrice: 7,
    limits: {
      storage: '1 GB',
      storageGb: 1,
      region: 'Sidoarjo',
      maxBuckets: 2,
      maxKeys: 2,
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'S3 Starter 5 GB',
    service: 'OBJECT_STORAGE',
    description: 'Compact 5 GB S3 object storage for personal apps, avatars, static assets & lightweight backups.',
    price: 15000,
    hourlyPrice: 21,
    limits: {
      storage: '5 GB',
      storageGb: 5,
      region: 'Sidoarjo',
      maxBuckets: 5,
      maxKeys: 5,
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'S3 Basic 10 GB',
    service: 'OBJECT_STORAGE',
    description: 'Popular 10 GB S3 storage with isolated buckets, presigned URLs & public/private ACL controls.',
    price: 25000,
    hourlyPrice: 35,
    limits: {
      storage: '10 GB',
      storageGb: 10,
      region: 'Sidoarjo',
      maxBuckets: 10,
      maxKeys: 10,
    },
    isActive: true,
    isPopular: true,
  },
  {
    name: 'S3 Standard 25 GB',
    service: 'OBJECT_STORAGE',
    description: 'Ideal for production web apps & media delivery with 25 GB S3 quota and 20 IAM Access Keys.',
    price: 55000,
    hourlyPrice: 76,
    limits: {
      storage: '25 GB',
      storageGb: 25,
      region: 'Sidoarjo',
      maxBuckets: 20,
      maxKeys: 20,
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'S3 Pro 50 GB',
    service: 'OBJECT_STORAGE',
    description: 'High-capacity 50 GB S3 object storage for growing workloads, multi-bucket teams & automated backups.',
    price: 100000,
    hourlyPrice: 137,
    limits: {
      storage: '50 GB',
      storageGb: 50,
      region: 'Sidoarjo',
      maxBuckets: 50,
      maxKeys: 50,
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'S3 Business 100 GB',
    service: 'OBJECT_STORAGE',
    description: '100 GB enterprise-grade S3 storage cluster with up to 100 isolated buckets, 100 IAM keys & priority I/O.',
    price: 200000,
    hourlyPrice: 274,
    limits: {
      storage: '100 GB',
      storageGb: 100,
      region: 'Sidoarjo',
      maxBuckets: 100,
      maxKeys: 100,
    },
    isActive: true,
    isPopular: false,
  },
];
