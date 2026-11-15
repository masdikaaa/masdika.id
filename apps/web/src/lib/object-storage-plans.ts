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
    name: 'S3 Starter 50 GB',
    service: 'OBJECT_STORAGE',
    description: 'Isolated S3-compatible object storage with 50 GB quota, custom IAM Access Keys & public/private bucket ACLs.',
    price: 25000,
    hourlyPrice: 35,
    limits: {
      storage: '50 GB',
      storageGb: 50,
      region: 'Sidoarjo',
      maxBuckets: 10,
      maxKeys: 10,
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'S3 Standard 100 GB',
    service: 'OBJECT_STORAGE',
    description: 'Ideal for production apps, backups & media assets with 100 GB S3 storage, presigned URLs & isolated IAM keys.',
    price: 50000,
    hourlyPrice: 69,
    limits: {
      storage: '100 GB',
      storageGb: 100,
      region: 'Sidoarjo',
      maxBuckets: 25,
      maxKeys: 25,
    },
    isActive: true,
    isPopular: true,
  },
  {
    name: 'S3 Pro 250 GB',
    service: 'OBJECT_STORAGE',
    description: 'High-capacity 250 GB S3 object storage for growing workloads, multi-bucket teams & automated backups.',
    price: 125000,
    hourlyPrice: 172,
    limits: {
      storage: '250 GB',
      storageGb: 250,
      region: 'Sidoarjo',
      maxBuckets: 50,
      maxKeys: 50,
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'S3 Business 500 GB',
    service: 'OBJECT_STORAGE',
    description: '500 GB enterprise-grade S3 storage cluster with dedicated IAM policies, high throughput & 99.9% uptime.',
    price: 250000,
    hourlyPrice: 343,
    limits: {
      storage: '500 GB',
      storageGb: 500,
      region: 'Sidoarjo',
      maxBuckets: 100,
      maxKeys: 100,
    },
    isActive: true,
    isPopular: false,
  },
  {
    name: 'S3 Enterprise 1 TB',
    service: 'OBJECT_STORAGE',
    description: '1 TB high-throughput S3 object storage with unlimited buckets, unlimited IAM keys & priority cluster I/O.',
    price: 500000,
    hourlyPrice: 685,
    limits: {
      storage: '1 TB',
      storageGb: 1000,
      region: 'Sidoarjo',
      maxBuckets: -1,
      maxKeys: -1,
    },
    isActive: true,
    isPopular: false,
  },
];
