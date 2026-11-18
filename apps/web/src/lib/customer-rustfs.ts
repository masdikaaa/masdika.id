import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  CopyObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  DeleteBucketCommand,
  HeadBucketCommand,
  ListBucketsCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  DeleteBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import * as crypto from 'crypto';
import { Readable } from 'stream';
import { prisma } from './prisma';
import { validateClusterOrStorageEndpoint } from './ssrf';

export interface CustomerRustFSConfig {
  enabled: boolean;
  endpoint: string;       // Internal S3 API endpoint (e.g. http://192.168.79.19:9000)
  publicEndpoint: string; // Public S3 domain from DB Settings (e.g. https://s3.masdika.id)
  consoleUrl: string;     // Optional console reference URL
  accessKey: string;
  secretKey: string;
  cdnBucketPrefix: string;
  objectStorageEnabled: boolean;
  ratePerGbMonthly: number;
}

let cachedCustomerConfig: CustomerRustFSConfig | null = null;
let lastCustomerFetch = 0;
const CACHE_TTL_MS = 60000;

let cachedCustomerS3Client: S3Client | null = null;
let cachedCustomerS3Sig = '';
const verifiedCustomerBuckets = new Set<string>();

export function invalidateCustomerRustFSCache() {
  cachedCustomerConfig = null;
  lastCustomerFetch = 0;
  cachedCustomerS3Client = null;
  cachedCustomerS3Sig = '';
  verifiedCustomerBuckets.clear();
}

export function validateCustomerRustFSEndpoint(endpoint: string): void {
  let parsed: URL;
  try {
    parsed = new URL(endpoint);
  } catch {
    throw new Error('Invalid Customer RustFS endpoint URL format.');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Customer RustFS endpoint must use http:// or https:// protocol.');
  }
  if (parsed.username || parsed.password) {
    throw new Error('Customer RustFS endpoint URL must not embed credentials.');
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (
    !host ||
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    host === '::' ||
    host === '::1' ||
    host === '0:0:0:0:0:0:0:1' ||
    host.startsWith('127.') ||
    host.startsWith('169.254.') ||
    host.startsWith('::ffff:127.') ||
    host.startsWith('::ffff:169.254.') ||
    host.startsWith('fe80:') ||
    host === 'metadata.google.internal'
  ) {
    throw new Error('Customer RustFS endpoint cannot target loopback or cloud metadata addresses.');
  }
}

export async function getCustomerRustFSConfig(): Promise<CustomerRustFSConfig> {
  const now = Date.now();
  if (cachedCustomerConfig && now - lastCustomerFetch < CACHE_TTL_MS) {
    return cachedCustomerConfig;
  }

  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            'customer_rustfs_enabled',
            'customer_rustfs_endpoint',
            'customer_rustfs_public_endpoint',
            'customer_rustfs_console_url',
            'customer_rustfs_access_key',
            'customer_rustfs_secret_key',
            'customer_rustfs_cdn_bucket_prefix',
            'object_storage_enabled',
            'object_storage_rate_per_gb',
          ],
        },
      },
    });

    const map = settings.reduce((acc, s) => {
      acc[s.key] = s.value;
      return acc;
    }, {} as Record<string, string>);

    const endpoint = (map['customer_rustfs_endpoint'] || process.env.CUSTOMER_RUSTFS_ENDPOINT || '')
      .trim()
      .replace(/\/+$/, '');
    const publicEndpoint = (
      map['customer_rustfs_public_endpoint'] ||
      process.env.CUSTOMER_RUSTFS_PUBLIC_ENDPOINT ||
      endpoint
    )
      .trim()
      .replace(/\/+$/, '');
    const consoleUrl = (map['customer_rustfs_console_url'] || '').trim().replace(/\/+$/, '');
    const accessKey = (map['customer_rustfs_access_key'] || process.env.CUSTOMER_RUSTFS_ACCESS_KEY || '').trim();
    const secretKey = (map['customer_rustfs_secret_key'] || process.env.CUSTOMER_RUSTFS_SECRET_KEY || '').trim();
    const cdnBucketPrefix = (map['customer_rustfs_cdn_bucket_prefix'] || 'masdika-cdn-u')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-');
    const enabledRaw = map['customer_rustfs_enabled'] ?? process.env.CUSTOMER_RUSTFS_ENABLED ?? 'false';
    const isConfigValid = Boolean(endpoint && accessKey && secretKey);
    const enabled = (enabledRaw === 'true' || enabledRaw === '1') && isConfigValid;
    const objectStorageEnabled = (map['object_storage_enabled'] ?? 'true') !== 'false';
    const rateParsed = Number(map['object_storage_rate_per_gb'] || '300');
    const ratePerGbMonthly = Number.isFinite(rateParsed) && rateParsed >= 50 ? Math.round(rateParsed) : 300;

    cachedCustomerConfig = {
      enabled,
      endpoint,
      publicEndpoint,
      consoleUrl,
      accessKey,
      secretKey,
      cdnBucketPrefix: cdnBucketPrefix || 'masdika-cdn-u',
      objectStorageEnabled,
      ratePerGbMonthly,
    };
    lastCustomerFetch = now;
    return cachedCustomerConfig;
  } catch (err) {
    console.error('[CustomerRustFS] Failed reading settings:', err);
    return {
      enabled: false,
      endpoint: '',
      publicEndpoint: '',
      consoleUrl: '',
      accessKey: '',
      secretKey: '',
      cdnBucketPrefix: 'masdika-cdn-u',
      objectStorageEnabled: true,
      ratePerGbMonthly: 300,
    };
  }
}

function createCustomerS3Client(config: CustomerRustFSConfig): S3Client {
  const sig = `${config.endpoint}|${config.accessKey}|${config.secretKey}`;
  if (cachedCustomerS3Client && cachedCustomerS3Sig === sig) {
    return cachedCustomerS3Client;
  }
  cachedCustomerS3Client = new S3Client({
    endpoint: config.endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });
  cachedCustomerS3Sig = sig;
  return cachedCustomerS3Client;
}

export async function getCustomerRustFSS3Client(): Promise<{
  client: S3Client;
  enabled: boolean;
  endpoint: string;
  publicEndpoint: string;
  config: CustomerRustFSConfig;
}> {
  const config = await getCustomerRustFSConfig();
  if (!config.enabled) {
    return {
      client: null as unknown as S3Client,
      enabled: false,
      endpoint: config.endpoint,
      publicEndpoint: config.publicEndpoint,
      config,
    };
  }
  validateCustomerRustFSEndpoint(config.endpoint);
  return {
    client: createCustomerS3Client(config),
    enabled: true,
    endpoint: config.endpoint,
    publicEndpoint: config.publicEndpoint,
    config,
  };
}

/**
 * Validates S3 DNS-compliant bucket name (3..63 chars, lowercase alphanumeric & hyphens)
 */
export function validateS3BucketName(name: string): { valid: boolean; normalized?: string; error?: string } {
  const normalized = (name || '').trim().toLowerCase();
  if (normalized.length < 3 || normalized.length > 63) {
    return { valid: false, error: 'Bucket name must be between 3 and 63 characters.' };
  }
  if (!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(normalized)) {
    return {
      valid: false,
      error: 'Bucket name may only contain lowercase letters, numbers, and hyphens (cannot start or end with hyphen).',
    };
  }
  if (normalized.includes('--') || /^\d+\.\d+\.\d+\.\d+$/.test(normalized)) {
    return { valid: false, error: 'Invalid S3 bucket name format.' };
  }
  const reservedPrefixes = ['masdika-media', 'masdika-ticket', 'masdika-database'];
  if (reservedPrefixes.includes(normalized)) {
    return { valid: false, error: 'This bucket name is reserved by system.' };
  }
  return { valid: true, normalized };
}

export function getDefaultCdnBucketName(
  userId: number,
  prefix = 'masdika-cdn-u',
  subscriptionId?: number
): string {
  const cleanPrefix = prefix.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '') || 'masdika-cdn-u';
  const suffix = subscriptionId ? `${userId}-s${subscriptionId}` : `${userId}`;
  return `${cleanPrefix}${suffix}`.slice(0, 63);
}

/**
 * Pre-flight capacity & health check for Customer RustFS cluster (AGENTS.md Section 5)
 */
export async function checkCustomerRustFSHealth(): Promise<{ available: boolean; error?: string; publicEndpoint?: string }> {
  try {
    const { client, enabled, publicEndpoint } = await getCustomerRustFSS3Client();
    if (!enabled || !client) {
      return {
        available: false,
        error: 'Customer Object Storage (RustFS) is not configured or currently disabled by administrator.',
      };
    }
    await client.send(new ListBucketsCommand({}));
    return { available: true, publicEndpoint };
  } catch (err: any) {
    return {
      available: false,
      error: `Customer RustFS storage cluster is unreachable: ${err?.message || 'Connection failed'}`,
    };
  }
}

export async function ensureCustomerBucketExists(
  bucketName: string,
  visibility: 'PUBLIC' | 'PRIVATE' = 'PRIVATE'
): Promise<boolean> {
  const { client, enabled } = await getCustomerRustFSS3Client();
  if (!enabled || !client) {
    throw new Error('Customer RustFS storage is not enabled.');
  }

  if (!verifiedCustomerBuckets.has(bucketName)) {
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucketName }));
      verifiedCustomerBuckets.add(bucketName);
    } catch (err: any) {
      if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404 || err.Code === 'NoSuchBucket') {
        await client.send(new CreateBucketCommand({ Bucket: bucketName }));
        verifiedCustomerBuckets.add(bucketName);
      } else {
        throw err;
      }
    }
  }

  if (visibility === 'PUBLIC') {
    await setCustomerBucketVisibility(bucketName, 'PUBLIC');
  }
  return true;
}

export async function setCustomerBucketVisibility(
  bucketName: string,
  visibility: 'PUBLIC' | 'PRIVATE'
): Promise<void> {
  const { client, enabled } = await getCustomerRustFSS3Client();
  if (!enabled || !client) return;

  if (visibility === 'PUBLIC') {
    const policy = {
      Version: '2012-10-17',
      Statement: [
        {
          Sid: 'PublicReadGetObject',
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    };
    await client.send(
      new PutBucketPolicyCommand({
        Bucket: bucketName,
        Policy: JSON.stringify(policy),
      })
    );
  } else {
    try {
      await client.send(new DeleteBucketPolicyCommand({ Bucket: bucketName }));
    } catch (err: any) {
      if (err.$metadata?.httpStatusCode !== 404 && err.Code !== 'NoSuchBucketPolicy') {
        throw err;
      }
    }
  }
}

export async function uploadStreamToCustomerRustFS(
  bucketName: string,
  key: string,
  stream: Readable,
  contentLength: number,
  mimeType = 'application/octet-stream'
): Promise<boolean> {
  const { client, enabled } = await getCustomerRustFSS3Client();
  if (!enabled || !client) return false;

  await ensureCustomerBucketExists(bucketName);
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: stream,
      ContentLength: contentLength,
      ContentType: mimeType,
    })
  );
  return true;
}

export async function uploadBufferToCustomerRustFS(
  bucketName: string,
  key: string,
  buffer: Buffer,
  mimeType = 'application/octet-stream'
): Promise<boolean> {
  const { client, enabled } = await getCustomerRustFSS3Client();
  if (!enabled || !client) return false;

  await ensureCustomerBucketExists(bucketName);
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: buffer,
      ContentLength: buffer.length,
      ContentType: mimeType,
    })
  );
  return true;
}

export async function getObjectStreamFromCustomerRustFS(
  bucketName: string,
  key: string,
  range?: string
): Promise<{
  stream: Readable;
  contentType?: string;
  contentLength?: number;
  contentRange?: string;
  acceptRanges?: string;
  statusCode: number;
} | null> {
  const { client, enabled } = await getCustomerRustFSS3Client();
  if (!enabled || !client) return null;

  try {
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: key,
        ...(range ? { Range: range } : {}),
      })
    );
    if (!res.Body) return null;
    return {
      stream: res.Body as Readable,
      contentType: res.ContentType,
      contentLength: res.ContentLength,
      contentRange: res.ContentRange,
      acceptRanges: res.AcceptRanges,
      statusCode: res.$metadata?.httpStatusCode || (range ? 206 : 200),
    };
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

export async function downloadBufferFromCustomerRustFS(bucketName: string, key: string): Promise<Buffer | null> {
  const { client, enabled } = await getCustomerRustFSS3Client();
  if (!enabled || !client) return null;

  try {
    const res = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: key }));
    if (!res.Body) return null;
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (err: any) {
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) return null;
    throw err;
  }
}

export async function deleteFromCustomerRustFS(bucketName: string, key: string): Promise<boolean> {
  const { client, enabled } = await getCustomerRustFSS3Client();
  if (!enabled || !client) return false;
  try {
    await client.send(new DeleteObjectCommand({ Bucket: bucketName, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function moveCustomerRustFSObject(
  sourceBucket: string,
  sourceKey: string,
  targetBucket: string,
  targetKey: string
): Promise<boolean> {
  const { client, enabled } = await getCustomerRustFSS3Client();
  if (!enabled || !client) return false;
  try {
    const encodedSource = `${encodeURIComponent(sourceBucket)}/${sourceKey
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/')}`;
    await client.send(
      new CopyObjectCommand({
        Bucket: targetBucket,
        Key: targetKey,
        CopySource: encodedSource,
      })
    );
    if (sourceBucket !== targetBucket || sourceKey !== targetKey) {
      await client.send(
        new DeleteObjectCommand({
          Bucket: sourceBucket,
          Key: sourceKey,
        })
      );
    }
    return true;
  } catch (err) {
    console.error('[CustomerRustFS] moveCustomerRustFSObject error:', err);
    return false;
  }
}

export async function listCustomerBucketObjects(
  bucketName: string,
  prefix = '',
  delimiter = '/'
): Promise<{
  folders: string[];
  objects: Array<{ key: string; size: number; lastModified: string | null; etag?: string }>;
}> {
  const { client, enabled } = await getCustomerRustFSS3Client();
  if (!enabled || !client) return { folders: [], objects: [] };

  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: bucketName,
      Prefix: prefix,
      Delimiter: delimiter || undefined,
      MaxKeys: 1000,
    })
  );

  const folders = (res.CommonPrefixes || []).map((p) => p.Prefix || '').filter(Boolean);
  const objects = (res.Contents || [])
    .filter((obj) => obj.Key && obj.Key !== prefix)
    .map((obj) => ({
      key: obj.Key!,
      size: Number(obj.Size || 0),
      lastModified: obj.LastModified ? obj.LastModified.toISOString() : null,
      etag: obj.ETag?.replace(/"/g, ''),
    }));

  return { folders, objects };
}

export async function getCustomerBucketUsage(bucketName: string): Promise<{ bytes: number; count: number }> {
  const { client, enabled } = await getCustomerRustFSS3Client();
  if (!enabled || !client) return { bytes: 0, count: 0 };

  let bytes = 0;
  let count = 0;
  let continuationToken: string | undefined = undefined;

  try {
    do {
      const res: any = await client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        })
      );
      for (const obj of res.Contents || []) {
        bytes += Number(obj.Size || 0);
        count += 1;
      }
      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);
  } catch {
    return { bytes: 0, count: 0 };
  }

  return { bytes, count };
}

export async function getObjectStorageServiceUsageBytes(bucketNames: string[]): Promise<{ totalBytes: number; totalObjects: number }> {
  let totalBytes = 0;
  let totalObjects = 0;
  const usages = await Promise.all(bucketNames.map((name) => getCustomerBucketUsage(name)));
  for (const u of usages) {
    totalBytes += u.bytes;
    totalObjects += u.count;
  }
  return { totalBytes, totalObjects };
}

export async function deleteCustomerBucketCompletely(bucketName: string): Promise<boolean> {
  const { client, enabled } = await getCustomerRustFSS3Client();
  if (!enabled || !client) return false;

  try {
    let continuationToken: string | undefined = undefined;
    do {
      const res: any = await client.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
          ContinuationToken: continuationToken,
          MaxKeys: 1000,
        })
      );
      const objects = (res.Contents || []).map((o: any) => ({ Key: o.Key }));
      if (objects.length > 0) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: bucketName,
            Delete: { Objects: objects, Quiet: true },
          })
        );
      }
      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (continuationToken);

    await client.send(new DeleteBucketCommand({ Bucket: bucketName }));
    verifiedCustomerBuckets.delete(bucketName);
    return true;
  } catch (err: any) {
    if (err.name === 'NoSuchBucket' || err.$metadata?.httpStatusCode === 404) {
      verifiedCustomerBuckets.delete(bucketName);
      return true;
    }
    console.error(`[CustomerRustFS] Failed deleting bucket ${bucketName}:`, err);
    return false;
  }
}

export async function headCustomerObject(bucketName: string, key: string): Promise<{ size: number; contentType?: string } | null> {
  const { client, enabled } = await getCustomerRustFSS3Client();
  if (!enabled || !client) return null;
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
    return { size: Number(res.ContentLength || 0), contentType: res.ContentType };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// AWS SigV4 Presigned URL & RustFS Admin IAM Service Account Helpers
// ---------------------------------------------------------------------------

function sha256Hex(data: string | Buffer): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function hmacSha256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac('sha256', key).update(data).digest();
}

function getSigV4SigningKey(secretKey: string, dateStamp: string, region: string, service: string): Buffer {
  const kDate = hmacSha256(`AWS4${secretKey}`, dateStamp);
  const kRegion = hmacSha256(kDate, region);
  const kService = hmacSha256(kRegion, service);
  return hmacSha256(kService, 'aws4_request');
}

function encodeS3Path(rawPath: string): string {
  return rawPath
    .split('/')
    .map((seg) => encodeURIComponent(seg))
    .join('/');
}

/**
 * Generates an AWS Signature V4 presigned URL using the configured public S3 domain (e.g. https://s2.masdika.id)
 */
export function createS3PresignedUrl({
  publicEndpoint,
  accessKey,
  secretKey,
  bucket,
  key,
  method = 'GET',
  expiresIn = 900,
}: {
  publicEndpoint: string;
  accessKey: string;
  secretKey: string;
  bucket: string;
  key: string;
  method?: 'GET' | 'PUT';
  expiresIn?: number;
}): string {
  const baseUrl = new URL(publicEndpoint);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'us-east-1';
  const service = 's3';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const cleanBasePath = baseUrl.pathname.replace(/\/+$/, '');
  const canonicalUri = `${cleanBasePath}/${encodeURIComponent(bucket)}/${encodeS3Path(key.replace(/^\/+/, ''))}`;

  const queryParams = new URLSearchParams({
    'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
    'X-Amz-Credential': `${accessKey}/${credentialScope}`,
    'X-Amz-Date': amzDate,
    'X-Amz-Expires': String(expiresIn),
    'X-Amz-SignedHeaders': 'host',
  });
  queryParams.sort();
  const canonicalQuery = queryParams.toString().replace(/\+/g, '%20');

  const canonicalHeaders = `host:${baseUrl.host}\n`;
  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuery,
    canonicalHeaders,
    'host',
    'UNSIGNED-PAYLOAD',
  ].join('\n');

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const signingKey = getSigV4SigningKey(secretKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  return `${baseUrl.origin}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

async function signedRustFSAdminRequest(
  config: CustomerRustFSConfig,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  pathWithQuery: string,
  bodyObj?: unknown
): Promise<{ ok: boolean; status: number; text: string }> {
  const url = new URL(`${config.endpoint}${pathWithQuery}`);
  const bodyStr = bodyObj !== undefined ? JSON.stringify(bodyObj) : '';
  const payloadHash = sha256Hex(bodyStr);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
  const dateStamp = amzDate.slice(0, 8);
  const region = 'us-east-1';
  const service = 's3';
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;

  const sortedQuery = new URLSearchParams(url.searchParams);
  sortedQuery.sort();
  const canonicalQuery = sortedQuery.toString();

  const canonicalHeaders =
    `host:${url.host}\n` + `x-amz-content-sha256:${payloadHash}\n` + `x-amz-date:${amzDate}\n`;
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';

  const canonicalRequest = [
    method,
    url.pathname,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join('\n');

  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, credentialScope, sha256Hex(canonicalRequest)].join('\n');
  const signingKey = getSigV4SigningKey(config.secretKey, dateStamp, region, service);
  const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

  const authorization = `AWS4-HMAC-SHA256 Credential=${config.accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(url.toString(), {
    method,
    headers: {
      Host: url.host,
      'x-amz-date': amzDate,
      'x-amz-content-sha256': payloadHash,
      Authorization: authorization,
      ...(bodyStr ? { 'Content-Type': 'application/json' } : {}),
    },
    body: bodyStr || undefined,
  });

  const text = await res.text().catch(() => '');
  return { ok: res.ok, status: res.status, text };
}

export function buildIsolatedBucketPolicy(
  bucketNames: string[],
  permission: 'READ_WRITE' | 'READ_ONLY' = 'READ_WRITE'
) {
  if (!bucketNames.length) {
    return {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Deny',
          Action: ['s3:*'],
          Resource: ['arn:aws:s3:::*'],
        },
      ],
    };
  }

  const bucketResources = bucketNames.map((b) => `arn:aws:s3:::${b}`);
  const objectResources = bucketNames.map((b) => `arn:aws:s3:::${b}/*`);

  const bucketActions = ['s3:GetBucketLocation', 's3:ListBucket', 's3:ListBucketMultipartUploads'];
  const objectActions =
    permission === 'READ_ONLY'
      ? ['s3:GetObject']
      : [
          's3:GetObject',
          's3:PutObject',
          's3:DeleteObject',
          's3:AbortMultipartUpload',
          's3:ListMultipartUploadParts',
        ];

  return {
    Version: '2012-10-17',
    Statement: [
      {
        Effect: 'Allow',
        Action: bucketActions,
        Resource: bucketResources,
      },
      {
        Effect: 'Allow',
        Action: objectActions,
        Resource: objectResources,
      },
    ],
  };
}

export async function createRustFSServiceAccount({
  accessKey,
  secretKey,
  name,
  bucketNames,
  permission = 'READ_WRITE',
}: {
  accessKey: string;
  secretKey: string;
  name: string;
  bucketNames: string[];
  permission?: 'READ_WRITE' | 'READ_ONLY';
}): Promise<{ success: boolean; error?: string }> {
  const config = await getCustomerRustFSConfig();
  if (!config.enabled) {
    return { success: false, error: 'Customer RustFS is not enabled.' };
  }

  const policy = buildIsolatedBucketPolicy(bucketNames, permission);
  const res = await signedRustFSAdminRequest(config, 'PUT', '/rustfs/admin/v3/add-service-account', {
    targetUser: config.accessKey,
    accessKey,
    secretKey,
    name,
    description: `Masdika Object Storage Key (${name})`,
    policy,
  });

  if (!res.ok) {
    return { success: false, error: `RustFS IAM error (${res.status}): ${res.text || 'Failed creating service account'}` };
  }
  return { success: true };
}

export async function updateRustFSServiceAccount({
  accessKey,
  bucketNames,
  permission = 'READ_WRITE',
  status,
}: {
  accessKey: string;
  bucketNames?: string[];
  permission?: 'READ_WRITE' | 'READ_ONLY';
  status?: 'on' | 'off';
}): Promise<{ success: boolean; error?: string }> {
  const config = await getCustomerRustFSConfig();
  if (!config.enabled) return { success: false, error: 'Customer RustFS not enabled.' };

  const payload: Record<string, any> = {};
  if (bucketNames !== undefined) {
    payload.policy = buildIsolatedBucketPolicy(bucketNames, permission);
  }
  if (status !== undefined) {
    payload.status = status;
  }

  const res = await signedRustFSAdminRequest(
    config,
    'POST',
    `/rustfs/admin/v3/update-service-account?accessKey=${encodeURIComponent(accessKey)}`,
    payload
  );

  if (!res.ok) {
    return { success: false, error: `RustFS IAM update error (${res.status}): ${res.text}` };
  }
  return { success: true };
}

export async function deleteRustFSServiceAccount(accessKey: string): Promise<boolean> {
  const config = await getCustomerRustFSConfig();
  if (!config.enabled) return false;
  const res = await signedRustFSAdminRequest(
    config,
    'DELETE',
    `/rustfs/admin/v3/delete-service-account?accessKey=${encodeURIComponent(accessKey)}`
  );
  return res.ok;
}

export async function doesCustomerBucketExistInRustFS(bucketName: string): Promise<boolean> {
  try {
    const config = await getCustomerRustFSConfig();
    if (!config.enabled) return false;
    const client = createCustomerS3Client(config);
    await client.send(new HeadBucketCommand({ Bucket: bucketName }));
    return true;
  } catch (err: any) {
    const status = err?.$metadata?.httpStatusCode;
    if (status === 404 || err?.name === 'NotFound' || err?.name === 'NoSuchBucket') {
      return false;
    }
    // Any other status (403, etc.) means bucket name is taken or inaccessible
    return status === 403;
  }
}

export async function getObjectStorageClusterCapacity(): Promise<{
  available: boolean;
  totalPoolGb: number;
  allocatedGb: number;
  freeGb: number;
  reason?: string;
}> {
  try {
    const [health, poolSetting, agg, cdnSubs] = await Promise.all([
      checkCustomerRustFSHealth(),
      prisma.setting.findUnique({ where: { key: 'customer_rustfs_max_pool_gb' } }),
      prisma.objectStorageService.aggregate({
        _sum: { storageGb: true },
        where: { status: { not: 'TERMINATED' } },
      }),
      prisma.subscription.findMany({
        where: {
          status: { in: ['ACTIVE', 'SUSPENDED'] },
          plan: { service: 'CDN' },
        },
        select: { plan: { select: { limits: true } } },
      }),
    ]);

    const parseCdnPlanGb = (limitsStr: string | null | undefined): number => {
      if (!limitsStr) return 0;
      try {
        const limits = JSON.parse(limitsStr);
        if (limits.storageGb !== undefined) return Number(limits.storageGb) || 0;
        if (limits.storageGB !== undefined) return Number(limits.storageGB) || 0;
        if (limits.storage) {
          const match = String(limits.storage).trim().match(/^(\d+)\s*(GB|MB|KB|TB)$/i);
          if (match) {
            const val = parseInt(match[1], 10);
            const unit = match[2].toUpperCase();
            if (unit === 'KB') return val / (1024 * 1024);
            if (unit === 'MB') return val / 1024;
            if (unit === 'GB') return val;
            if (unit === 'TB') return val * 1024;
          }
        }
      } catch {
        // ignore malformed limits
      }
      return 0;
    };

    const totalPoolGb = Math.max(10, Number(poolSetting?.value || 500) || 500);
    const objectStorageAllocatedGb = Number(agg._sum.storageGb || 0);
    const cdnAllocatedGb = cdnSubs.reduce((sum, sub) => sum + parseCdnPlanGb(sub.plan?.limits), 0);
    const allocatedGb = objectStorageAllocatedGb + cdnAllocatedGb;
    const freeGb = Math.max(0, totalPoolGb - allocatedGb);

    if (!health.available) {
      return {
        available: false,
        totalPoolGb,
        allocatedGb,
        freeGb: 0,
        reason: health.error || 'Storage cluster is offline',
      };
    }

    return {
      available: freeGb > 0,
      totalPoolGb,
      allocatedGb,
      freeGb,
      reason: freeGb <= 0 ? 'Storage server pool is full' : undefined,
    };
  } catch (error: any) {
    return {
      available: false,
      totalPoolGb: 500,
      allocatedGb: 0,
      freeGb: 0,
      reason: error?.message || 'Failed to check Object Storage capacity',
    };
  }
}

export async function setCustomerBucketQuota(bucketName: string, quotaBytes: number): Promise<boolean> {
  try {
    const config = await getCustomerRustFSConfig();
    if (!config.enabled) return false;
    const res = await signedRustFSAdminRequest(
      config,
      'PUT',
      `/rustfs/admin/v3/set-bucket-quota?bucket=${encodeURIComponent(bucketName)}`,
      { quota: quotaBytes, quotatype: 'hard' }
    );
    return res.ok;
  } catch (error) {
    console.warn('[CustomerRustFS] setCustomerBucketQuota warning:', error);
    return false;
  }
}

export async function syncObjectStorageKeyPolicies(serviceId: number): Promise<void> {
  const [buckets, keys] = await Promise.all([
    prisma.objectStorageBucket.findMany({ where: { serviceId }, select: { name: true } }),
    prisma.objectStorageKey.findMany({ where: { serviceId, isActive: true } }),
  ]);
  const bucketNames = buckets.map((b) => b.name);
  await Promise.all(
    keys.map((k) =>
      updateRustFSServiceAccount({
        accessKey: k.accessKey,
        bucketNames,
        permission: k.permission === 'READ_ONLY' ? 'READ_ONLY' : 'READ_WRITE',
      }).catch((e) => console.warn('[CustomerRustFS] Policy sync failed for key:', k.accessKey, e))
    )
  );
}

export async function suspendObjectStorageInfrastructure(serviceId: number): Promise<void> {
  const keys = await prisma.objectStorageKey.findMany({ where: { serviceId } });
  await Promise.all(
    keys.map((k) =>
      updateRustFSServiceAccount({ accessKey: k.accessKey, status: 'off' }).catch((e) =>
        console.warn('[CustomerRustFS] Failed disabling key on suspend:', k.accessKey, e)
      )
    )
  );
  await prisma.objectStorageKey.updateMany({
    where: { serviceId },
    data: { isActive: false },
  });
}

export async function unsuspendObjectStorageInfrastructure(serviceId: number): Promise<void> {
  const [buckets, keys] = await Promise.all([
    prisma.objectStorageBucket.findMany({ where: { serviceId }, select: { name: true } }),
    prisma.objectStorageKey.findMany({ where: { serviceId } }),
  ]);
  const bucketNames = buckets.map((b) => b.name);
  await Promise.all(
    keys.map((k) =>
      updateRustFSServiceAccount({
        accessKey: k.accessKey,
        bucketNames,
        permission: k.permission === 'READ_ONLY' ? 'READ_ONLY' : 'READ_WRITE',
        status: 'on',
      }).catch((e) => console.warn('[CustomerRustFS] Failed enabling key on unsuspend:', k.accessKey, e))
    )
  );
  await prisma.objectStorageKey.updateMany({
    where: { serviceId },
    data: { isActive: true },
  });
}

export async function terminateObjectStorageInfrastructure(serviceId: number): Promise<void> {
  const [buckets, keys] = await Promise.all([
    prisma.objectStorageBucket.findMany({ where: { serviceId }, select: { name: true } }),
    prisma.objectStorageKey.findMany({ where: { serviceId }, select: { accessKey: true } }),
  ]);
  await Promise.all(keys.map((k) => deleteRustFSServiceAccount(k.accessKey).catch(() => false)));
  await Promise.all(buckets.map((b) => deleteCustomerBucketCompletely(b.name).catch(() => false)));
}

export async function testCustomerRustFSConnection(customConfig?: {
  endpoint?: string;
  publicEndpoint?: string;
  accessKey?: string;
  secretKey?: string;
}): Promise<{
  success: boolean;
  message: string;
  bucketsCount?: number;
}> {
  try {
    const storedConfig = await getCustomerRustFSConfig();
    const endpoint = (customConfig?.endpoint ?? storedConfig.endpoint).trim().replace(/\/+$/, '');
    const accessKey = (customConfig?.accessKey ?? storedConfig.accessKey).trim();
    const rawSecret = customConfig?.secretKey !== undefined ? customConfig.secretKey.trim() : storedConfig.secretKey;

    let secretKey = rawSecret;
    if (rawSecret === '••••••••' || (customConfig?.secretKey === undefined && customConfig?.endpoint)) {
      if (endpoint && storedConfig.endpoint && endpoint !== storedConfig.endpoint.trim().replace(/\/+$/, '')) {
        return {
          success: false,
          message: 'Please enter the Secret Key explicitly when testing a different endpoint URL.',
        };
      }
      secretKey = storedConfig.secretKey;
    }

    if (!endpoint || !accessKey || !secretKey) {
      return {
        success: false,
        message: 'Customer RustFS Endpoint, Access Key ID, and Secret Access Key are required.',
      };
    }

    validateCustomerRustFSEndpoint(endpoint);
    await validateClusterOrStorageEndpoint(endpoint, 'Customer RustFS endpoint');

    const client = new S3Client({
      region: 'us-east-1',
      endpoint,
      credentials: { accessKeyId: accessKey, secretAccessKey: secretKey },
      forcePathStyle: true,
      requestHandler: { requestTimeout: 10000 } as any,
    });

    const res = await client.send(new ListBucketsCommand({}));
    const bucketsCount = res.Buckets?.length ?? 0;

    return {
      success: true,
      message: `Successfully connected to Customer RustFS (${endpoint}). Found ${bucketsCount} bucket(s).`,
      bucketsCount,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Failed to connect to Customer RustFS.',
    };
  }
}
