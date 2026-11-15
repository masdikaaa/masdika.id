import { describe, it, expect } from 'vitest';
import {
  validateS3BucketName,
  getDefaultCdnBucketName,
  validateCustomerRustFSEndpoint,
  createS3PresignedUrl,
  buildIsolatedBucketPolicy,
} from '../customer-rustfs';
import { generateCdnApiKey, hashCdnApiKey } from '../cdn-api-auth';

describe('Customer RustFS Isolation & Object Storage Helpers', () => {
  it('validates S3 bucket names strictly', () => {
    expect(validateS3BucketName('my-app-assets-01').valid).toBe(true);
    expect(validateS3BucketName('ab').valid).toBe(false);
    expect(validateS3BucketName('bad_bucket!').valid).toBe(false);
    expect(validateS3BucketName('-bad-start').valid).toBe(false);
    expect(validateS3BucketName('192.168.1.1').valid).toBe(false);
  });

  it('generates isolated per-customer default CDN bucket names', () => {
    expect(getDefaultCdnBucketName(42, 'masdika-cdn-u')).toBe('masdika-cdn-u42');
    expect(getDefaultCdnBucketName(7, 'CUSTOM_PREFIX_')).toBe('custom-prefix7');
  });

  it('blocks loopback and cloud metadata SSRF endpoints while allowing LAN/public URLs', () => {
    expect(() => validateCustomerRustFSEndpoint('http://127.0.0.1:9000')).toThrow();
    expect(() => validateCustomerRustFSEndpoint('http://169.254.169.254')).toThrow();
    expect(() => validateCustomerRustFSEndpoint('http://localhost:9000')).toThrow();
    expect(() => validateCustomerRustFSEndpoint('http://192.168.79.19:9000')).not.toThrow();
    expect(() => validateCustomerRustFSEndpoint('https://s2.masdika.id')).not.toThrow();
  });

  it('creates SigV4 presigned URLs using dynamic DB-configured endpoint', () => {
    const url = createS3PresignedUrl({
      publicEndpoint: 'https://custom-s3.example.com',
      accessKey: 'mcs3_testaccess',
      secretKey: 'supersecretkeyvalue123456',
      bucket: 'tenant-bucket',
      key: 'folder/report.pdf',
      method: 'GET',
      expiresIn: 900,
    });
    expect(url.startsWith('https://custom-s3.example.com/tenant-bucket/folder/report.pdf?')).toBe(true);
    expect(url).toContain('X-Amz-Algorithm=AWS4-HMAC-SHA256');
    expect(url).toContain('X-Amz-Expires=900');
    expect(url).toContain('X-Amz-Signature=');
  });

  it('builds strictly scoped IAM bucket policies for customer keys', () => {
    const policy = buildIsolatedBucketPolicy(['cust-b1', 'cust-b2'], 'READ_ONLY');
    expect(policy.Statement[0].Action).toEqual([
      's3:GetBucketLocation',
      's3:ListBucket',
      's3:ListBucketMultipartUploads',
    ]);
    expect(policy.Statement[0].Resource).toEqual([
      'arn:aws:s3:::cust-b1',
      'arn:aws:s3:::cust-b2',
    ]);
    expect(policy.Statement[1].Action).toEqual(['s3:GetObject']);
    expect(policy.Statement[1].Resource).toEqual([
      'arn:aws:s3:::cust-b1/*',
      'arn:aws:s3:::cust-b2/*',
    ]);
  });

  it('generates and hashes File CDN API keys deterministically', () => {
    const { rawKey, keyHash, keyPrefix } = generateCdnApiKey();
    expect(rawKey.startsWith('mc_cdn_')).toBe(true);
    expect(keyPrefix).toBe(rawKey.slice(0, 14));
    expect(hashCdnApiKey(rawKey)).toBe(keyHash);
    expect(keyHash).toHaveLength(64);
  });
});
