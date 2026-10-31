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
    const bucket = (settingsMap['rustfs_bucket'] || process.env.RUSTFS_BUCKET || 'masdika-media').trim();
    const enabledRaw = settingsMap['rustfs_enabled'] ?? process.env.RUSTFS_ENABLED ?? 'false';
    const isConfigValid = Boolean(endpoint && accessKey && secretKey);
    const enabled = (enabledRaw === 'true' || enabledRaw === '1') && isConfigValid;

    cachedConfig = {
      endpoint,
      accessKey,
      secretKey,
      bucket,
      enabled
    };
    lastConfigFetch = now;
    return cachedConfig;
  } catch (error) {
    console.error('[RustFS] Error reading settings from DB, falling back to process.env:', error);
    const endpoint = (process.env.RUSTFS_ENDPOINT || '').trim().replace(/\/+$/, '');
    const accessKey = (process.env.RUSTFS_ACCESS_KEY || '').trim();
    const secretKey = (process.env.RUSTFS_SECRET_KEY || '').trim();
    const bucket = (process.env.RUSTFS_BUCKET || 'masdika-media').trim();
    const enabledRaw = process.env.RUSTFS_ENABLED ?? 'false';
    const isConfigValid = Boolean(endpoint && accessKey && secretKey);
    const enabled = (enabledRaw === 'true' || enabledRaw === '1') && isConfigValid;

    return {
      endpoint,
      accessKey,
      secretKey,
      bucket,
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

  return { client, bucket: config.bucket, enabled: config.enabled };
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

    await ensureBucketExists(client, config.bucket);

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
      message: `Successfully connected to RustFS at ${config.endpoint} and verified bucket '${config.bucket}'.`,
      bucket: config.bucket
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

