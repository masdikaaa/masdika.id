import {
  S3Client,
  HeadBucketCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command
} from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import crypto from "crypto";

export interface CloudStorageConfig {
  provider: "R2" | "S3" | "GDRIVE" | string;
  endpoint?: string | null;
  bucket?: string | null;
  region?: string | null;
  accessKeyId?: string | null;
  secretAccessKey?: string | null;
  pathPrefix?: string | null;
  gdriveFolderId?: string | null;
  gdriveClientEmail?: string | null;
  gdrivePrivateKey?: string | null;
  gdriveRefreshToken?: string | null;
}

// ==========================================
// AWS S3 & Cloudflare R2 Helper
// ==========================================
export function getS3Client(config: CloudStorageConfig): S3Client {
  const isR2 = config.provider === "R2";
  
  let endpoint = config.endpoint?.trim() || undefined;
  let region = config.region?.trim() || (isR2 ? "auto" : "us-east-1");

  // If R2 and endpoint is not full URL, or user provided Account ID
  if (isR2 && endpoint && !endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
    endpoint = `https://${endpoint}.r2.cloudflarestorage.com`;
  }

  return new S3Client({
    region: region || "auto",
    endpoint: endpoint || undefined,
    credentials: {
      accessKeyId: config.accessKeyId?.trim() || "",
      secretAccessKey: config.secretAccessKey?.trim() || ""
    },
    // Force path style is recommended for certain S3-compatible endpoints / minio / r2
    forcePathStyle: !isR2 && endpoint ? true : false
  });
}

/**
 * Test S3 / Cloudflare R2 connection
 */
export async function testS3Storage(config: CloudStorageConfig): Promise<{ success: boolean; message: string }> {
  try {
    if (!config.bucket) throw new Error("Bucket name is required");
    if (!config.accessKeyId) throw new Error("Access Key ID is required");
    if (!config.secretAccessKey) throw new Error("Secret Access Key is required");

    const client = getS3Client(config);

    // Try listing with max-keys 1 to verify both read and bucket existence
    const listCmd = new ListObjectsV2Command({
      Bucket: config.bucket.trim(),
      MaxKeys: 1
    });

    await client.send(listCmd);
    return {
      success: true,
      message: `Successfully connected to ${config.provider === "R2" ? "Cloudflare R2" : "AWS S3"} bucket "${config.bucket}"`
    };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    return {
      success: false,
      message: `Connection failed: ${errorMsg}`
    };
  }
}

/**
 * Stream upload to S3 / Cloudflare R2 (Memory safe: only holds ~10MB buffer chunks)
 */
export async function uploadStreamToS3(
  config: CloudStorageConfig,
  params: {
    key: string;
    body: any;
    contentType?: string;
  }
): Promise<{ success: boolean; key: string }> {
  const client = getS3Client(config);
  const bucket = config.bucket?.trim();
  if (!bucket) throw new Error("Bucket name is missing");

  const parallelUploads3 = new Upload({
    client,
    params: {
      Bucket: bucket,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType || "application/octet-stream"
    },
    queueSize: 4,
    partSize: 10 * 1024 * 1024 // 10MB chunk size
  });

  await parallelUploads3.done();
  return { success: true, key: params.key };
}

/**
 * Upload buffer or stream to S3 / Cloudflare R2
 */
export async function uploadToS3(
  config: CloudStorageConfig,
  params: {
    key: string;
    body: Buffer | Uint8Array | Blob | string | ReadableStream;
    contentType?: string;
    contentLength?: number;
  }
): Promise<{ success: boolean; key: string }> {
  const client = getS3Client(config);
  const bucket = config.bucket?.trim();
  if (!bucket) throw new Error("Bucket name is missing");

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: params.key,
    Body: params.body as any,
    ContentType: params.contentType || "application/octet-stream",
    ContentLength: params.contentLength
  });

  await client.send(cmd);
  return { success: true, key: params.key };
}

/**
 * Generate Presigned Download URL for S3 / Cloudflare R2
 */
export async function getS3PresignedDownloadUrl(
  config: CloudStorageConfig,
  key: string,
  expiresInSeconds = 3600
): Promise<string> {
  const client = getS3Client(config);
  const bucket = config.bucket?.trim();
  if (!bucket) throw new Error("Bucket name is missing");

  const cmd = new GetObjectCommand({
    Bucket: bucket,
    Key: key
  });

  return await getSignedUrl(client, cmd, { expiresIn: expiresInSeconds });
}

/**
 * Delete object from S3 / Cloudflare R2
 */
export async function deleteFromS3(config: CloudStorageConfig, key: string): Promise<boolean> {
  const client = getS3Client(config);
  const bucket = config.bucket?.trim();
  if (!bucket) throw new Error("Bucket name is missing");

  const cmd = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key
  });

  await client.send(cmd);
  return true;
}

// ==========================================
// Google Drive Helper (Service Account OAuth2 JWT)
// ==========================================

/**
 * Generate Google OAuth2 Bearer Access Token using Service Account credentials
 */
export async function getGoogleDriveAccessToken(config: CloudStorageConfig): Promise<string> {
  const clientEmail = config.gdriveClientEmail?.trim();
  let privateKey = config.gdrivePrivateKey?.trim();

  if (!clientEmail || !privateKey) {
    throw new Error("Google Drive Service Account Email and Private Key are required");
  }

  // Handle escaped newlines in private key
  if (privateKey.includes("\\n")) {
    privateKey = privateKey.replace(/\\n/g, "\n");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/drive",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now
  };

  const base64UrlEncode = (str: string) =>
    Buffer.from(str)
      .toString("base64")
      .replace(/=/g, "")
      .replace(/\+/g, "-")
      .replace(/\//g, "_");

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedClaim = base64UrlEncode(JSON.stringify(claimSet));
  const stringToSign = `${encodedHeader}.${encodedClaim}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(stringToSign);
  const signature = signer.sign(privateKey, "base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const assertion = `${stringToSign}.${signature}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  if (!tokenRes.ok) {
    const errorText = await tokenRes.text();
    throw new Error(`Google Auth Token request failed: ${errorText}`);
  }

  const data = await tokenRes.json();
  return data.access_token;
}

/**
 * Test Google Drive connection and folder access
 */
export async function testGoogleDriveStorage(config: CloudStorageConfig): Promise<{ success: boolean; message: string }> {
  try {
    const token = await getGoogleDriveAccessToken(config);
    const folderId = config.gdriveFolderId?.trim();

    if (folderId && folderId.length > 5) {
      // Validate folder access with Shared Drive support
      const folderRes = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(folderId)}?supportsAllDrives=true&fields=id,name,mimeType,capabilities,driveId`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (!folderRes.ok) {
        const errText = await folderRes.text();
        throw new Error(`Folder verification failed (${folderRes.status}): Ensure the folder ID is correct and shared with the Service Account email (${config.gdriveClientEmail}). Detail: ${errText}`);
      }

      const folderData = await folderRes.json();

      // Check write capabilities
      if (folderData.capabilities && folderData.capabilities.canAddChildren === false) {
        throw new Error(`Service Account does not have write permissions for folder "${folderData.name || folderId}". Grant 'Editor' or 'Content Manager' permissions on the folder/Shared Drive.`);
      }

      // Perform a 1-byte probe write to ensure Service Account quota is valid (Shared Drive verification)
      const probeBoundary = "-------ProbeGoogleDriveBoundary";
      const probeMeta = JSON.stringify({
        name: ".backup_write_probe.tmp",
        parents: [folderId],
        mimeType: "text/plain"
      });
      const probeBody = `--${probeBoundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${probeMeta}\r\n--${probeBoundary}\r\nContent-Type: text/plain\r\n\r\nprobe\r\n--${probeBoundary}--`;

      const probeRes = await fetch(
        "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": `multipart/related; boundary=${probeBoundary}`
          },
          body: probeBody
        }
      );

      if (!probeRes.ok) {
        const probeErr = await probeRes.text();
        if (probeErr.includes("storageQuotaExceeded") || probeErr.includes("do not have storage quota")) {
          throw new Error("Insufficient Google Drive Quota: Google Cloud Service Accounts have a 0 MB storage quota on personal Google Drive (Personal My Drive). Google requires using a Google Workspace Shared Drive (Team Drive). Add the Service Account to a Shared Drive as Content Manager, or use Cloudflare R2 / AWS S3.");
        }
        throw new Error(`Folder write permission test failed (${probeRes.status}): ${probeErr}`);
      }

      const probeFile = await probeRes.json().catch(() => null);
      if (probeFile?.id) {
        // Clean up probe file
        await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(probeFile.id)}?supportsAllDrives=true`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` }
        }).catch(() => {});
      }

      return {
        success: true,
        message: `Connection & write permissions successfully verified for folder "${folderData.name || folderId}"!`
      };
    } else {
      // Validate general Drive access
      const aboutRes = await fetch("https://www.googleapis.com/drive/v3/about?fields=user", {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (!aboutRes.ok) {
        const err = await aboutRes.text();
        throw new Error(`Drive access failed: ${err}`);
      }

      return {
        success: true,
        message: "Google Drive Service Account authentication successful! (Note: Enter a Folder ID from a Google Workspace Shared Drive for backup storage)"
      };
    }
  } catch (err: any) {
    return {
      success: false,
      message: err.message || String(err)
    };
  }
}

/**
 * Stream file to Google Drive using Resumable Upload API
 * Memory safe: streams data chunks directly without buffering full file in RAM
 */
export async function streamUploadToGoogleDrive(
  config: CloudStorageConfig,
  params: {
    filename: string;
    stream: any;
    contentLength: number;
    mimeType?: string;
  }
): Promise<{ success: boolean; fileId: string; webViewLink?: string }> {
  const token = await getGoogleDriveAccessToken(config);
  const folderId = config.gdriveFolderId?.trim();

  const metadata: any = {
    name: params.filename,
    mimeType: params.mimeType || "application/octet-stream"
  };

  if (folderId && folderId.length > 5) {
    metadata.parents = [folderId];
  }

  // Step 1: Initiate Resumable Upload Session with Shared Drive support
  const initRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true&fields=id,name,webViewLink,size",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": params.mimeType || "application/octet-stream",
        "X-Upload-Content-Length": params.contentLength.toString()
      },
      body: JSON.stringify(metadata)
    }
  );

  if (!initRes.ok) {
    const errText = await initRes.text();
    if (errText.includes("storageQuotaExceeded") || errText.includes("do not have storage quota")) {
      throw new Error("Insufficient Google Drive Quota: Google Cloud Service Accounts have a 0 MB storage quota on personal Google Drive (Personal My Drive). Google requires using a Google Workspace Shared Drive (Team Drive). Add the Service Account to a Shared Drive as Content Manager, or use Cloudflare R2 / AWS S3.");
    }
    throw new Error(`Google Drive resumable session initiation failed (${initRes.status}): ${errText}`);
  }

  const uploadLocation = initRes.headers.get("Location");
  if (!uploadLocation) {
    throw new Error("Google Drive did not return a resumable upload location URL");
  }

  // Step 2: Stream bytes directly to the upload location
  const uploadRes = await fetch(uploadLocation, {
    method: "PUT",
    headers: {
      "Content-Length": params.contentLength.toString(),
      "Content-Type": params.mimeType || "application/octet-stream"
    },
    // @ts-expect-error Node.js fetch streaming body requirement
    duplex: "half",
    body: params.stream
  });

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    if (errText.includes("storageQuotaExceeded") || errText.includes("do not have storage quota")) {
      throw new Error("Insufficient Google Drive Quota: Service Accounts do not have storage quota on personal Google Drive. Please use a Google Workspace Shared Drive (Team Drive) or Cloudflare R2 / AWS S3.");
    }
    throw new Error(`Google Drive stream upload failed (${uploadRes.status}): ${errText}`);
  }

  const fileData = await uploadRes.json();
  return {
    success: true,
    fileId: fileData.id,
    webViewLink: fileData.webViewLink
  };
}

/**
 * Upload file to Google Drive using multipart upload
 */
export async function uploadToGoogleDrive(
  config: CloudStorageConfig,
  params: {
    filename: string;
    buffer: Buffer;
    mimeType?: string;
  }
): Promise<{ success: boolean; fileId: string; webViewLink?: string }> {
  const token = await getGoogleDriveAccessToken(config);
  const folderId = config.gdriveFolderId?.trim();

  const metadata: any = {
    name: params.filename,
    mimeType: params.mimeType || "application/octet-stream"
  };

  if (folderId && folderId.length > 5) {
    metadata.parents = [folderId];
  }

  const boundary = "-------314159265358979323846";
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metaPart = `Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}`;
  const fileHeader = `Content-Type: ${params.mimeType || "application/octet-stream"}\r\n\r\n`;

  const multipartBody = Buffer.concat([
    Buffer.from(delimiter),
    Buffer.from(metaPart),
    Buffer.from(delimiter),
    Buffer.from(fileHeader),
    params.buffer,
    Buffer.from(closeDelimiter)
  ]);

  const uploadRes = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,name,webViewLink,size",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
        "Content-Length": multipartBody.length.toString()
      },
      body: multipartBody
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    if (errText.includes("storageQuotaExceeded") || errText.includes("do not have storage quota")) {
      throw new Error("Insufficient Google Drive Quota: Google Cloud Service Accounts have a 0 MB storage quota on personal Google Drive (Personal My Drive). Google requires using a Google Workspace Shared Drive (Team Drive). Add the Service Account to a Shared Drive as Content Manager, or use Cloudflare R2 / AWS S3.");
    }
    throw new Error(`Google Drive upload failed (${uploadRes.status}): ${errText}`);
  }

  const fileData = await uploadRes.json();
  return {
    success: true,
    fileId: fileData.id,
    webViewLink: fileData.webViewLink
  };
}

/**
 * Delete file from Google Drive
 */
export async function deleteFromGoogleDrive(config: CloudStorageConfig, fileId: string): Promise<boolean> {
  const token = await getGoogleDriveAccessToken(config);

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?supportsAllDrives=true`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` }
  });

  if (!res.ok && res.status !== 404) {
    const errText = await res.text();
    throw new Error(`Failed to delete Google Drive file (${res.status}): ${errText}`);
  }

  return true;
}
