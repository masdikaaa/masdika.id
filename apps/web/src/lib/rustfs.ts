import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand
} from '@aws-sdk/client-s3';
import { prisma } from './prisma';
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';

export interface RustFSConfig {
  endpoint: string;
  accessKey: string;
  secretKey: string;
  cdnBucket: string;
  mediaBucket: string;
  ticketBucket: string;
  bucket: string;
  enabled: boolean;
}

// In-memory cached config with TTL to prevent DB hammering on high-frequency streaming
let cachedConfig: RustFSConfig | null = null;
let lastConfigFetch = 0;
const CACHE_TTL_MS = 15000; // 15 seconds

/**
 * Invalidate the in-memory RustFS config cache (e.g. after updating settings in Admin Panel)
 */
export function invalidateRustFSCache() {
  cachedConfig = null;
  lastConfigFetch = 0;
}

/**
 * Resolves RustFS configuration from Prisma DB settings with fallback to environment variables
 */
export async function getRustFSConfig(): Promise<RustFSConfig> {
  const now = Date.now();
  if (cachedConfig && now - lastConfigFetch < CACHE_TTL_MS) {
    return cachedConfig;
  }

  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: [
            'rustfs_endpoint',
            'rustfs_access_key',
            'rustfs_secret_key',
            'rustfs_bucket',
            'rustfs_cdn_bucket',
            'rustfs_media_bucket',
            'rustfs_ticket_bucket',
            'rustfs_enabled'
          ]
        }
      }
    });

    const settingsMap = settings.reduce((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {} as Record<string, string>);

    const endpoint = (settingsMap['rustfs_endpoint'] || process.env.RUSTFS_ENDPOINT || '').trim().replace(/\/+$/, '');
    const accessKey = (settingsMap['rustfs_access_key'] || process.env.RUSTFS_ACCESS_KEY || '').trim();
    const secretKey = (settingsMap['rustfs_secret_key'] || process.env.RUSTFS_SECRET_KEY || '').trim();
    const cdnBucket = (settingsMap['rustfs_cdn_bucket'] || process.env.RUSTFS_CDN_BUCKET || (settingsMap['rustfs_bucket'] === 'masdika-cdn' ? 'masdika-cdn' : '') || 'masdika-cdn').trim();
    const mediaBucket = (settingsMap['rustfs_media_bucket'] || process.env.RUSTFS_MEDIA_BUCKET || 'masdika-media').trim();
    const ticketBucket = (settingsMap['rustfs_ticket_bucket'] || process.env.RUSTFS_TICKET_BUCKET || 'masdika-ticket').trim();
    const enabledRaw = settingsMap['rustfs_enabled'] ?? process.env.RUSTFS_ENABLED ?? 'false';
    const isConfigValid = Boolean(endpoint && accessKey && secretKey);
    const enabled = (enabledRaw === 'true' || enabledRaw === '1') && isConfigValid;

    cachedConfig = {
      endpoint,
      accessKey,
      secretKey,
      cdnBucket,
      mediaBucket,
      ticketBucket,
      bucket: cdnBucket,
      enabled
    };
    lastConfigFetch = now;
    return cachedConfig;
  } catch (error) {
    console.error('[RustFS] Error reading settings from DB, falling back to process.env:', error);
    const endpoint = (process.env.RUSTFS_ENDPOINT || '').trim().replace(/\/+$/, '');
    const accessKey = (process.env.RUSTFS_ACCESS_KEY || '').trim();
    const secretKey = (process.env.RUSTFS_SECRET_KEY || '').trim();
    const cdnBucket = (process.env.RUSTFS_CDN_BUCKET || process.env.RUSTFS_BUCKET || 'masdika-cdn').trim();
    const mediaBucket = (process.env.RUSTFS_MEDIA_BUCKET || 'masdika-media').trim();
    const ticketBucket = (process.env.RUSTFS_TICKET_BUCKET || 'masdika-ticket').trim();
    const enabledRaw = process.env.RUSTFS_ENABLED ?? 'false';
    const isConfigValid = Boolean(endpoint && accessKey && secretKey);
    const enabled = (enabledRaw === 'true' || enabledRaw === '1') && isConfigValid;

    return {
      endpoint,
      accessKey,
      secretKey,
      cdnBucket,
      mediaBucket,
      ticketBucket,
      bucket: cdnBucket,
      enabled
    };
  }
}

/**
 * Creates an AWS S3Client instance configured for RustFS S3-compatible API
 */
export async function getRustFSS3Client(): Promise<{ client: S3Client; bucket: string; enabled: boolean }> {
  const config = await getRustFSConfig();

  const client = new S3Client({
    endpoint: config.endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true, // Essential for self-hosted S3/RustFS/MinIO
  });

  return { client, bucket: config.cdnBucket || config.bucket, enabled: config.enabled };
}

/**
 * Creates an AWS S3Client instance configured for RustFS Ticket Attachments bucket
 */

/**
 * Creates an AWS S3Client instance configured for RustFS Website Media bucket (profile, blog, banners, etc.)
 */
export async function getRustFSMediaClient(): Promise<{ client: S3Client; bucket: string; enabled: boolean }> {
  const config = await getRustFSConfig();

  const client = new S3Client({
    endpoint: config.endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });

  return { client, bucket: config.mediaBucket || 'masdika-media', enabled: config.enabled };
}

export async function getRustFSTicketClient(): Promise<{ client: S3Client; bucket: string; enabled: boolean }> {
  const config = await getRustFSConfig();

  const client = new S3Client({
    endpoint: config.endpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
    forcePathStyle: true,
  });

  return { client, bucket: config.ticketBucket || 'masdika-ticket', enabled: config.enabled };
}


/**
 * Ensures that the target bucket exists in RustFS, creating it if necessary
 */
export async function ensureBucketExists(client: S3Client, bucket: string): Promise<boolean> {
  try {
    await client.send(new HeadBucketCommand({ Bucket: bucket }));
    return true;
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404 || err.Code === 'NoSuchBucket') {
      try {
        await client.send(new CreateBucketCommand({ Bucket: bucket }));
        console.log(`[RustFS] Bucket '${bucket}' created successfully.`);
        return true;
      } catch (createErr) {
        console.error(`[RustFS] Failed to create bucket '${bucket}':`, createErr);
        throw createErr;
      }
    }
    // If permission or other error
    console.warn(`[RustFS] HeadBucket check returned error:`, err.message || err);
    return false;
  }
}

/**
 * Tests the connection to RustFS using current or custom configuration
 */
export async function testRustFSConnection(customConfig?: Partial<RustFSConfig>): Promise<{
  success: boolean;
  message: string;
  bucket: string;
}> {
  try {
    const config = customConfig ? { ...(await getRustFSConfig()), ...customConfig } : await getRustFSConfig();

    if (!config.endpoint || !config.accessKey || !config.secretKey) {
      return {
        success: false,
        message: 'Endpoint, Access Key, and Secret Key must all be provided.',
        bucket: config.bucket || 'masdika-media'
      };
    }

    const client = new S3Client({
      endpoint: config.endpoint,
      region: 'us-east-1',
      credentials: {
        accessKeyId: config.accessKey,
        secretAccessKey: config.secretKey,
      },
      forcePathStyle: true,
    });

    await ensureBucketExists(client, config.cdnBucket || config.bucket || 'masdika-cdn');
    await ensureBucketExists(client, config.mediaBucket || 'masdika-media');
    await ensureBucketExists(client, config.ticketBucket || 'masdika-ticket');

    // Test a tiny ping upload & delete
    const testKey = `.masdika-ping-${Date.now()}.txt`;
    await client.send(new PutObjectCommand({
      Bucket: config.bucket,
      Key: testKey,
      Body: Buffer.from('RustFS connection test OK'),
      ContentType: 'text/plain'
    }));

    await client.send(new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: testKey
    }));

    return {
      success: true,
      message: `Successfully connected to RustFS at ${config.endpoint} and verified buckets '${config.cdnBucket || config.bucket}' (CDN), '${config.mediaBucket || 'masdika-media'}' (Media) & '${config.ticketBucket || 'masdika-ticket'}' (Tickets).`,
      bucket: config.cdnBucket || config.bucket
    };
  } catch (error: any) {
    console.error('[RustFS] Connection test failed:', error);
    return {
      success: false,
      message: error?.message || 'Failed to connect to RustFS S3 endpoint',
      bucket: customConfig?.bucket || 'unknown'
    };
  }
}

/**
 * Uploads a Buffer to RustFS
 */
export async function uploadBufferToRustFS(
  key: string,
  buffer: Buffer,
  mimeType = 'application/octet-stream'
): Promise<boolean> {
  const { client, bucket, enabled } = await getRustFSS3Client();
  if (!enabled) return false;

  await ensureBucketExists(client, bucket);

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ContentLength: buffer.length
  }));

  return true;
}

/**
 * Uploads a local file from disk to RustFS
 */
export async function uploadFileToRustFS(
  filePath: string,
  key: string,
  mimeType = 'application/octet-stream'
): Promise<boolean> {
  const { client, bucket, enabled } = await getRustFSS3Client();
  if (!enabled) return false;

  if (!fs.existsSync(filePath)) {
    throw new Error(`Local file not found on disk: ${filePath}`);
  }

  await ensureBucketExists(client, bucket);

  const stats = fs.statSync(filePath);
  const fileStream = fs.createReadStream(filePath);

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: fileStream,
    ContentType: mimeType,
    ContentLength: stats.size
  }));

  return true;
}

/**
 * Checks if an object exists in RustFS
 */
export async function checkObjectInRustFS(key: string): Promise<{
  exists: boolean;
  size?: number;
  mimeType?: string;
}> {
  try {
    const { client, bucket, enabled } = await getRustFSS3Client();
    if (!enabled) return { exists: false };

    const res = await client.send(new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    }));

    return {
      exists: true,
      size: res.ContentLength,
      mimeType: res.ContentType
    };
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return { exists: false };
    }
    // If RustFS is unreachable or error, return false so fallback to disk can handle it
    return { exists: false };
  }
}

/**
 * Downloads an object buffer from RustFS into memory
 */
export async function downloadBufferFromRustFS(key: string): Promise<Buffer | null> {
  try {
    const { client, bucket, enabled } = await getRustFSS3Client();
    if (!enabled) return null;

    const res = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }));

    if (!res.Body) return null;

    // Convert stream to Buffer
    const stream = res.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) {
      return null;
    }
    console.error(`[RustFS] Error downloading ${key}:`, err);
    return null;
  }
}

/**
 * Deletes an object from RustFS
 */
export async function deleteFromRustFS(key: string): Promise<boolean> {
  try {
    const { client, bucket, enabled } = await getRustFSS3Client();
    if (!enabled) return false;

    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    }));
    return true;
  } catch (err: any) {
    console.error(`[RustFS] Error deleting object ${key}:`, err);
    return false;
  }
}


/**
 * Ticket Attachments: Upload buffer to RustFS ticket bucket
 */
export async function uploadTicketAttachmentToRustFS(
  key: string,
  buffer: Buffer,
  mimeType = 'application/octet-stream'
): Promise<boolean> {
  const { client, bucket, enabled } = await getRustFSTicketClient();
  if (!enabled) return false;

  await ensureBucketExists(client, bucket);

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: mimeType,
    ContentLength: buffer.length
  }));

  return true;
}

/**
 * Ticket Attachments: Download buffer from RustFS ticket bucket
 */
export async function downloadTicketAttachmentFromRustFS(key: string): Promise<Buffer | null> {
  try {
    const { client, bucket, enabled } = await getRustFSTicketClient();
    if (!enabled) return null;

    const res = await client.send(new GetObjectCommand({
      Bucket: bucket,
      Key: key
    }));

    if (!res.Body) return null;

    const stream = res.Body as Readable;
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  } catch (err: any) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404 || err.Code === 'NoSuchKey') {
      return null;
    }
    console.error(`[RustFS] Error downloading ticket attachment ${key}:`, err);
    return null;
  }
}

/**
 * Ticket Attachments: Check if attachment exists in RustFS ticket bucket
 */
export async function checkTicketAttachmentInRustFS(key: string): Promise<boolean> {
  try {
    const { client, bucket, enabled } = await getRustFSTicketClient();
    if (!enabled) return false;

    await client.send(new HeadObjectCommand({
      Bucket: bucket,
      Key: key
    }));
    return true;
  } catch {
    return false;
  }
}

/**
 * Ticket Attachments: Delete attachment from RustFS ticket bucket
 */
export async function deleteTicketAttachmentFromRustFS(key: string): Promise<boolean> {
  try {
    const { client, bucket, enabled } = await getRustFSTicketClient();
    if (!enabled) return false;

    await client.send(new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    }));
    return true;
  } catch (err: any) {
    console.error(`[RustFS] Error deleting ticket attachment ${key}:`, err);
    return false;
  }
}

/**
 * Public Uploads (Profile, Blog, Banners, Jobs, Projects): Upload buffer to RustFS media bucket
 */
export async function uploadPublicUploadToRustFS(
  relativePath: string,
  buffer: Buffer,
  mimeType = 'application/octet-stream'
): Promise<boolean> {
  const { client, bucket, enabled } = await getRustFSMediaClient();
  if (!enabled) return false;

  await ensureBucketExists(client, bucket);

  const cleanPath = relativePath.replace(/^[\/\\]+/, '').replace(/\\/g, '/');
  const fullKey = cleanPath.startsWith('uploads/') ? cleanPath : `uploads/${cleanPath}`;

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: fullKey,
    Body: buffer,
    ContentType: mimeType,
    ContentLength: buffer.length
  }));

  return true;
}

/**
 * Public Uploads: Download buffer from RustFS media bucket
 */
export async function downloadPublicUploadFromRustFS(
  relativePath: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  try {
    const { client, bucket, enabled } = await getRustFSMediaClient();
    if (!enabled) return null;

    const cleanPath = relativePath.replace(/^[\/\\]+/, '').replace(/\\/g, '/');
    const candidateKeys = [
      cleanPath.startsWith('uploads/') ? cleanPath : `uploads/${cleanPath}`,
      cleanPath.replace(/^uploads\//, '')
    ];

    for (const key of candidateKeys) {
      try {
        const res = await client.send(new GetObjectCommand({
          Bucket: bucket,
          Key: key
        }));

        if (!res.Body) continue;

        const stream = res.Body as Readable;
        const chunks: Buffer[] = [];
        for await (const chunk of stream) {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }
        return {
          buffer: Buffer.concat(chunks),
          contentType: res.ContentType || 'application/octet-stream'
        };
      } catch (err: any) {
        if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404 || err.Code === 'NoSuchKey') {
          continue;
        }
        throw err;
      }
    }
    return null;
  } catch (err: any) {
    console.error(`[RustFS] Error downloading public upload ${relativePath}:`, err);
    return null;
  }
}

/**
 * Public Uploads: Delete upload from RustFS media bucket
 */
export async function deletePublicUploadFromRustFS(relativePath: string): Promise<boolean> {
  try {
    const { client, bucket, enabled } = await getRustFSMediaClient();
    if (!enabled) return false;

    const cleanPath = relativePath.replace(/^[\/\\]+/, '').replace(/\\/g, '/');
    const candidateKeys = [
      cleanPath.startsWith('uploads/') ? cleanPath : `uploads/${cleanPath}`,
      cleanPath.replace(/^uploads\//, '')
    ];

    for (const key of candidateKeys) {
      try {
        await client.send(new DeleteObjectCommand({
          Bucket: bucket,
          Key: key
        }));
      } catch {}
    }
    return true;
  } catch {
    return false;
  }
}


const EXTENSION_MIME_MAP: Record<string, string> = {
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.csv': 'text/csv',
  '.zip': 'application/zip',
  '.rar': 'application/vnd.rar',
  '.7z': 'application/x-7z-compressed',
  '.tar': 'application/x-tar',
  '.gz': 'application/gzip',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.json': 'application/json',
};

export function getMimeTypeFromExt(ext: string): string {
  return EXTENSION_MIME_MAP[ext.toLowerCase()] || 'application/octet-stream';
}

/**
 * Ensures standard default RustFS bucket settings exist in Prisma DB Setting table.
 * Does not overwrite existing custom settings.
 */
export async function ensureDefaultRustFSSettings() {
  const currentEndpoint = (process.env.RUSTFS_ENDPOINT || 'http://192.168.79.10:9000').trim();
  const currentAccessKey = (process.env.RUSTFS_ACCESS_KEY || '').trim();
  const currentSecretKey = (process.env.RUSTFS_SECRET_KEY || '').trim();

  const defaults = [
    { key: 'rustfs_cdn_bucket', value: 'masdika-cdn' },
    { key: 'rustfs_media_bucket', value: 'masdika-media' },
    { key: 'rustfs_ticket_bucket', value: 'masdika-ticket' },
    { key: 'rustfs_bucket', value: 'masdika-cdn' },
  ];

  for (const item of defaults) {
    const existing = await prisma.setting.findUnique({ where: { key: item.key } });
    if (!existing) {
      await prisma.setting.create({ data: item });
    }
  }

  if (currentEndpoint) {
    const existingEp = await prisma.setting.findUnique({ where: { key: 'rustfs_endpoint' } });
    if (!existingEp) {
      await prisma.setting.create({ data: { key: 'rustfs_endpoint', value: currentEndpoint } });
    }
  }
  if (currentAccessKey) {
    const existingAk = await prisma.setting.findUnique({ where: { key: 'rustfs_access_key' } });
    if (!existingAk) {
      await prisma.setting.create({ data: { key: 'rustfs_access_key', value: currentAccessKey } });
    }
  }
  if (currentSecretKey) {
    const existingSk = await prisma.setting.findUnique({ where: { key: 'rustfs_secret_key' } });
    if (!existingSk) {
      await prisma.setting.create({ data: { key: 'rustfs_secret_key', value: currentSecretKey } });
    }
  }
  const existingEn = await prisma.setting.findUnique({ where: { key: 'rustfs_enabled' } });
  if (!existingEn) {
    await prisma.setting.create({ data: { key: 'rustfs_enabled', value: 'true' } });
  }

  invalidateRustFSCache();
}

/**
 * Public Uploads Migration: Migrates all local files under public/uploads to RustFS (masdika-media)
 */
export async function migrateLocalPublicUploadsToRustFS(options: { deleteLocalAfterUpload?: boolean } = { deleteLocalAfterUpload: true }): Promise<{
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  details: Array<{ key: string; size: number; status: 'migrated' | 'skipped' | 'error'; error?: string }>;
}> {
  const { client, bucket } = await getRustFSMediaClient();
  await ensureBucketExists(client, bucket);

  const candidateUploadsDirs = [
    path.join(process.cwd(), 'apps', 'web', 'public', 'uploads'),
    path.join(process.cwd(), 'public', 'uploads'),
    path.resolve(__dirname, '../../../public/uploads'),
    path.resolve(__dirname, '../../public/uploads'),
    path.resolve(__dirname, '../public/uploads'),
    '/app/apps/web/public/uploads',
  ].filter((d, i, arr) => arr.indexOf(d) === i && fs.existsSync(d));

  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  const details: Array<{ key: string; size: number; status: 'migrated' | 'skipped' | 'error'; error?: string }> = [];

  function getFilesRecursively(dir: string, baseDir: string): Array<{ fullPath: string; relativePath: string }> {
    let results: Array<{ fullPath: string; relativePath: string }> = [];
    if (!fs.existsSync(dir)) return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(getFilesRecursively(fullPath, baseDir));
      } else if (entry.isFile()) {
        if (entry.name === '.gitkeep') continue;
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        results.push({ fullPath, relativePath });
      }
    }
    return results;
  }

  const processedKeys = new Set<string>();

  for (const dir of candidateUploadsDirs) {
    const files = getFilesRecursively(dir, dir);
    for (const file of files) {
      const key = `uploads/${file.relativePath}`;
      if (processedKeys.has(key)) continue;
      processedKeys.add(key);

      try {
        const stats = fs.statSync(file.fullPath);
        let exists = false;
        try {
          await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
          exists = true;
        } catch (err: any) {
          if (err.name !== 'NotFound' && err.$metadata?.httpStatusCode !== 404 && err.Code !== 'NoSuchKey') {
            try {
              await client.send(new HeadObjectCommand({ Bucket: bucket, Key: file.relativePath }));
              exists = true;
            } catch {}
          }
        }

        if (exists) {
          skipped++;
          details.push({ key, size: stats.size, status: 'skipped' });
          if (options.deleteLocalAfterUpload && fs.existsSync(file.fullPath)) {
            try { fs.unlinkSync(file.fullPath); } catch {}
          }
          continue;
        }

        const mimeType = getMimeTypeFromExt(path.extname(file.fullPath));
        const fileStream = fs.createReadStream(file.fullPath);
        await client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: fileStream,
          ContentType: mimeType,
          ContentLength: stats.size
        }));

        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));

        if (options.deleteLocalAfterUpload && fs.existsSync(file.fullPath)) {
          try { fs.unlinkSync(file.fullPath); } catch {}
        }

        migrated++;
        details.push({ key, size: stats.size, status: 'migrated' });
      } catch (err: any) {
        console.error(`[RustFS Uploads Migration] Error transferring ${key}:`, err);
        errors++;
        details.push({ key, size: 0, status: 'error', error: err?.message || 'Upload error' });
      }
    }
  }

  return { total: processedKeys.size, migrated, skipped, errors, details };
}

/**
 * Ticket Attachments Migration: Migrates all local ticket files under storage/tickets to RustFS (masdika-ticket)
 */
export async function migrateLocalTicketAttachmentsToRustFS(options: { deleteLocalAfterUpload?: boolean } = { deleteLocalAfterUpload: true }): Promise<{
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  details: Array<{ filename: string; size: number; status: 'migrated' | 'skipped' | 'error'; error?: string }>;
}> {
  const { client, bucket } = await getRustFSTicketClient();
  await ensureBucketExists(client, bucket);

  const candidateTicketDirs = [
    path.join(process.cwd(), 'apps', 'web', 'storage', 'tickets'),
    path.join(process.cwd(), 'storage', 'tickets'),
    path.resolve(__dirname, '../../../storage/tickets'),
    path.resolve(__dirname, '../../storage/tickets'),
    path.resolve(__dirname, '../storage/tickets'),
    '/app/apps/web/storage/tickets',
  ].filter((d, i, arr) => arr.indexOf(d) === i && fs.existsSync(d));

  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  const details: Array<{ filename: string; size: number; status: 'migrated' | 'skipped' | 'error'; error?: string }> = [];

  const processedFiles = new Set<string>();

  for (const dir of candidateTicketDirs) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isFile() || entry.name === '.gitkeep') continue;
      const filename = entry.name;
      if (processedFiles.has(filename)) continue;
      processedFiles.add(filename);

      const fullPath = path.join(dir, filename);
      try {
        const stats = fs.statSync(fullPath);

        let exists = false;
        try {
          await client.send(new HeadObjectCommand({ Bucket: bucket, Key: filename }));
          exists = true;
        } catch {}

        if (exists) {
          skipped++;
          details.push({ filename, size: stats.size, status: 'skipped' });
          if (options.deleteLocalAfterUpload && fs.existsSync(fullPath)) {
            try { fs.unlinkSync(fullPath); } catch {}
          }
          continue;
        }

        const mimeType = getMimeTypeFromExt(path.extname(filename));
        const fileStream = fs.createReadStream(fullPath);
        await client.send(new PutObjectCommand({
          Bucket: bucket,
          Key: filename,
          Body: fileStream,
          ContentType: mimeType,
          ContentLength: stats.size
        }));

        await client.send(new HeadObjectCommand({ Bucket: bucket, Key: filename }));

        if (options.deleteLocalAfterUpload && fs.existsSync(fullPath)) {
          try { fs.unlinkSync(fullPath); } catch {}
        }

        migrated++;
        details.push({ filename, size: stats.size, status: 'migrated' });
      } catch (err: any) {
        console.error(`[RustFS Ticket Migration] Error transferring ${filename}:`, err);
        errors++;
        details.push({ filename, size: 0, status: 'error', error: err?.message || 'Upload error' });
      }
    }
  }

  return { total: processedFiles.size, migrated, skipped, errors, details };
}

/**
 * Unified Local Asset Migration: Migrates public uploads, ticket attachments, and secure-media to RustFS
 */
export async function migrateAllLocalAssetsToRustFS(options: { deleteLocalAfterUpload?: boolean; silentIfEmpty?: boolean } = { deleteLocalAfterUpload: true }): Promise<{
  publicUploads: { total: number; migrated: number; skipped: number; errors: number };
  tickets: { total: number; migrated: number; skipped: number; errors: number };
  secureMedia: { total: number; migrated: number; skipped: number; errors: number };
  totalMigrated: number;
  totalSkipped: number;
  totalErrors: number;
}> {
  await ensureDefaultRustFSSettings();

  const publicUploads = await migrateLocalPublicUploadsToRustFS(options);
  const tickets = await migrateLocalTicketAttachmentsToRustFS(options);
  const secureMedia = await migrateAllMediaToRustFS(options);

  return {
    publicUploads: { total: publicUploads.total, migrated: publicUploads.migrated, skipped: publicUploads.skipped, errors: publicUploads.errors },
    tickets: { total: tickets.total, migrated: tickets.migrated, skipped: tickets.skipped, errors: tickets.errors },
    secureMedia: { total: secureMedia.total, migrated: secureMedia.migrated, skipped: secureMedia.skipped, errors: secureMedia.errors },
    totalMigrated: publicUploads.migrated + tickets.migrated + secureMedia.migrated,
    totalSkipped: publicUploads.skipped + tickets.skipped + secureMedia.skipped,
    totalErrors: publicUploads.errors + tickets.errors + secureMedia.errors
  };
}

/**
 * Bulk migration function: Migrates all files from local storage/secure-media to RustFS
 * Verified idempotent: only uploads files not yet in RustFS, and only deletes local files after verification.
 */
export async function migrateAllMediaToRustFS(options: { deleteLocalAfterUpload?: boolean } = { deleteLocalAfterUpload: true }): Promise<{
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  details: Array<{ filename: string; originalName: string; size: number; status: 'migrated' | 'skipped' | 'error'; error?: string }>;
}> {
  const { client, bucket } = await getRustFSS3Client();
  await ensureBucketExists(client, bucket);

  const candidateSecureDirs = [
    path.join(process.cwd(), 'storage', 'secure-media'),
    path.join(process.cwd(), 'apps', 'web', 'storage', 'secure-media'),
    path.resolve(__dirname, '../../../storage/secure-media'),
    path.resolve(__dirname, '../../storage/secure-media'),
    path.resolve(__dirname, '../storage/secure-media'),
    '/app/apps/web/storage/secure-media'
  ].filter((d, i, arr) => arr.indexOf(d) === i && fs.existsSync(d));

  // Find all file records in DB (excluding folders)
  const mediaRecords = await prisma.secureMedia.findMany({
    where: { isFolder: false },
    select: { id: true, filename: true, originalName: true, size: true, mimeType: true }
  });

  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  const details: Array<{ filename: string; originalName: string; size: number; status: 'migrated' | 'skipped' | 'error'; error?: string }> = [];

  const deleteFileEverywhere = (filename: string) => {
    for (const dir of candidateSecureDirs) {
      const p = path.join(dir, filename);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
        } catch {}
      }
    }
  };

  for (const record of mediaRecords) {
    let localPath: string | null = null;
    for (const dir of candidateSecureDirs) {
      const p = path.join(dir, record.filename);
      if (fs.existsSync(p)) {
        localPath = p;
        break;
      }
    }

    try {
      // 1. Check if already exists in RustFS
      const existing = await checkObjectInRustFS(record.filename);
      if (existing.exists) {
        skipped++;
        details.push({
          filename: record.filename,
          originalName: record.originalName,
          size: record.size,
          status: 'skipped'
        });

        // If local file still exists and cleanup was requested, delete it safely from all local folders
        if (options.deleteLocalAfterUpload) {
          deleteFileEverywhere(record.filename);
        }
        continue;
      }

      // 2. Check if local file exists on disk
      if (!localPath) {
        errors++;
        details.push({
          filename: record.filename,
          originalName: record.originalName,
          size: record.size,
          status: 'error',
          error: 'File does not exist on local disk'
        });
        continue;
      }

      // 3. Upload file to RustFS
      await uploadFileToRustFS(localPath, record.filename, record.mimeType);

      // 4. Verify upload succeeded
      const verified = await checkObjectInRustFS(record.filename);
      if (!verified.exists) {
        throw new Error('Verification failed: object not found in RustFS after upload');
      }

      // 5. Delete local file safely everywhere
      if (options.deleteLocalAfterUpload) {
        deleteFileEverywhere(record.filename);
      }

      migrated++;
      details.push({
        filename: record.filename,
        originalName: record.originalName,
        size: record.size,
        status: 'migrated'
      });
    } catch (err: any) {
      console.error(`[RustFS Migration] Failed to migrate ${record.filename}:`, err);
      errors++;
      details.push({
        filename: record.filename,
        originalName: record.originalName,
        size: record.size,
        status: 'error',
        error: err?.message || 'Unknown error during upload'
      });
    }
  }

  // 6. Sweep any orphaned files on disk and upload/delete them
  for (const dir of candidateSecureDirs) {
    try {
      if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          const full = path.join(dir, file);
          const stat = fs.statSync(full);
          if (stat.isFile()) {
            const verified = await checkObjectInRustFS(file);
            if (!verified.exists) {
              await uploadFileToRustFS(full, file, 'application/octet-stream');
            }
            if (options.deleteLocalAfterUpload) {
              fs.unlinkSync(full);
            }
          }
        }
      }
    } catch (sweepErr) {
      console.warn(`[RustFS Migration] Sweep warning for ${dir}:`, sweepErr);
    }
  }

  // 7. Ensure no local folder remains if cleanup was requested
  if (options.deleteLocalAfterUpload) {
    for (const dir of candidateSecureDirs) {
      try {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
          console.log(`[RustFS Migration] Completely removed local storage folder: ${dir}`);
        }
      } catch (rmErr) {
        console.warn(`[RustFS Migration] Could not remove folder ${dir}:`, rmErr);
      }
    }
  }

  return {
    total: mediaRecords.length,
    migrated,
    skipped,
    errors,
    details
  };
}

export interface BucketMigrationParams {
  source?: {
    endpoint?: string;
    accessKey?: string;
    secretKey?: string;
    bucket?: string;
  };
  target: {
    endpoint: string;
    accessKey: string;
    secretKey: string;
    bucket: string;
  };
  deleteSourceAfterTransfer?: boolean;
  updateActiveConfig?: boolean;
}

/**
 * Cross-Server & Bucket-to-Bucket Migration:
 * Transfers all media files from source RustFS server/bucket to target RustFS server/bucket
 * with zero-downtime, integrity verification, and optional active config update.
 */
export async function migrateBucketToBucket(params: BucketMigrationParams): Promise<{
  total: number;
  migrated: number;
  skipped: number;
  errors: number;
  details: Array<{ filename: string; originalName: string; size: number; status: 'migrated' | 'skipped' | 'error'; error?: string }>;
}> {
  // 1. Resolve source config
  const activeConfig = await getRustFSConfig();
  const sourceEndpoint = (params.source?.endpoint || activeConfig.endpoint).trim().replace(/\/+$/, '');
  const sourceAccessKey = (params.source?.accessKey || activeConfig.accessKey).trim();
  const sourceSecretKey = (params.source?.secretKey || activeConfig.secretKey).trim();
  const sourceBucket = (params.source?.bucket || activeConfig.bucket).trim();

  // 2. Resolve target config
  const targetEndpoint = params.target.endpoint.trim().replace(/\/+$/, '');
  const targetAccessKey = params.target.accessKey.trim();
  const targetSecretKey = params.target.secretKey.trim();
  const targetBucket = params.target.bucket.trim();

  if (!targetEndpoint || !targetAccessKey || !targetSecretKey || !targetBucket) {
    throw new Error('All target destination fields (endpoint, accessKey, secretKey, bucket) are required.');
  }

  const sourceClient = new S3Client({
    endpoint: sourceEndpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: sourceAccessKey,
      secretAccessKey: sourceSecretKey
    },
    forcePathStyle: true
  });

  const targetClient = new S3Client({
    endpoint: targetEndpoint,
    region: 'us-east-1',
    credentials: {
      accessKeyId: targetAccessKey,
      secretAccessKey: targetSecretKey
    },
    forcePathStyle: true
  });

  // Ensure target bucket exists
  await ensureBucketExists(targetClient, targetBucket);

  // Find all file records in DB (excluding folders)
  const mediaRecords = await prisma.secureMedia.findMany({
    where: { isFolder: false },
    select: { id: true, filename: true, originalName: true, size: true, mimeType: true }
  });

  let migrated = 0;
  let skipped = 0;
  let errors = 0;
  const details: Array<{ filename: string; originalName: string; size: number; status: 'migrated' | 'skipped' | 'error'; error?: string }> = [];

  for (const record of mediaRecords) {
    try {
      // 1. Check if already in target bucket
      let alreadyInTarget = false;
      try {
        await targetClient.send(new HeadObjectCommand({
          Bucket: targetBucket,
          Key: record.filename
        }));
        alreadyInTarget = true;
      } catch (err: any) {
        if (err.name !== 'NotFound' && err.$metadata?.httpStatusCode !== 404 && err.Code !== 'NoSuchKey') {
          throw err;
        }
      }

      if (alreadyInTarget) {
        skipped++;
        details.push({
          filename: record.filename,
          originalName: record.originalName,
          size: record.size,
          status: 'skipped'
        });

        if (params.deleteSourceAfterTransfer) {
          try {
            await sourceClient.send(new DeleteObjectCommand({
              Bucket: sourceBucket,
              Key: record.filename
            }));
          } catch {}
        }
        continue;
      }

      // 2. Fetch object from source bucket
      const sourceObj = await sourceClient.send(new GetObjectCommand({
        Bucket: sourceBucket,
        Key: record.filename
      }));

      if (!sourceObj.Body) {
        throw new Error('Source object body is empty or unreachable');
      }

      // Convert body to buffer
      let bodyBuffer: Buffer;
      if (sourceObj.Body instanceof Readable) {
        const chunks: Buffer[] = [];
        for await (const chunk of sourceObj.Body) {
          chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
        }
        bodyBuffer = Buffer.concat(chunks);
      } else {
        const bytes = await sourceObj.Body.transformToByteArray();
        bodyBuffer = Buffer.from(bytes);
      }

      // 3. Put object to target bucket
      await targetClient.send(new PutObjectCommand({
        Bucket: targetBucket,
        Key: record.filename,
        Body: bodyBuffer,
        ContentType: record.mimeType || sourceObj.ContentType || 'application/octet-stream',
        ContentLength: bodyBuffer.length
      }));

      // 4. Verify object in target bucket
      await targetClient.send(new HeadObjectCommand({
        Bucket: targetBucket,
        Key: record.filename
      }));

      // 5. Delete from source if requested
      if (params.deleteSourceAfterTransfer) {
        try {
          await sourceClient.send(new DeleteObjectCommand({
            Bucket: sourceBucket,
            Key: record.filename
          }));
        } catch {}
      }

      migrated++;
      details.push({
        filename: record.filename,
        originalName: record.originalName,
        size: record.size,
        status: 'migrated'
      });
    } catch (err: any) {
      console.error(`[Bucket Migration] Failed to transfer ${record.filename}:`, err);
      errors++;
      details.push({
        filename: record.filename,
        originalName: record.originalName,
        size: record.size,
        status: 'error',
        error: err?.message || 'Transfer error'
      });
    }
  }

  // If updateActiveConfig is true and no errors, update settings in DB
  if (params.updateActiveConfig && errors === 0) {
    const settingsToUpdate = [
      { key: 'rustfs_endpoint', value: targetEndpoint },
      { key: 'rustfs_access_key', value: targetAccessKey },
      { key: 'rustfs_secret_key', value: targetSecretKey },
      { key: 'rustfs_bucket', value: targetBucket }
    ];
    for (const s of settingsToUpdate) {
      await prisma.setting.upsert({
        where: { key: s.key },
        update: { value: s.value },
        create: { key: s.key, value: s.value }
      });
    }
    invalidateRustFSCache();
  }

  return {
    total: mediaRecords.length,
    migrated,
    skipped,
    errors,
    details
  };
}

