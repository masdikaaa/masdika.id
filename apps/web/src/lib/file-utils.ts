import fs from 'fs';
import path from 'path';

/**
 * Resolves the absolute path to public/uploads directory.
 * Guaranteed to resolve correctly whether running from monorepo root, apps/web, or Docker container.
 */
export function getUploadsDir(...subpaths: string[]): string {
  const monorepoPath = path.resolve(process.cwd(), 'apps', 'web', 'public', 'uploads');
  if (fs.existsSync(monorepoPath)) {
    return path.join(monorepoPath, ...subpaths);
  }
  return path.resolve(process.cwd(), 'public', 'uploads', ...subpaths);
}

/**
 * Resolves the absolute path to public directory.
 * Guaranteed to resolve correctly whether running from monorepo root, apps/web, or Docker container.
 */
export function getPublicDir(...subpaths: string[]): string {
  const monorepoPath = path.resolve(process.cwd(), 'apps', 'web', 'public');
  if (fs.existsSync(monorepoPath)) {
    return path.join(monorepoPath, ...subpaths);
  }
  return path.resolve(process.cwd(), 'public', ...subpaths);
}

/**
 * Deletes a file from the public/uploads directory given its URL.
 * Example URL: /uploads/banners/file-123.webp
 * @param fileUrl The URL/path stored in the database
 */
export function deleteLocalFile(fileUrl: string | null | undefined) {
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
    return;
  }

  try {
    const filename = fileUrl.replace(/^\/uploads\//, '');
    const baseDir = getUploadsDir();
    const filePath = path.resolve(baseDir, filename);

    // Bulletproof Path Traversal prevention
    // Ensure the resolved absolute path still resides within our base uploads directory
    if (!filePath.toLowerCase().startsWith(baseDir.toLowerCase())) {
      console.warn('[deleteLocalFile] Aborting: Path traversal detected or mismatch');
      return;
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[deleteLocalFile] Successfully deleted:', filePath);
    }
  } catch (error) {
    console.error('Failed to delete local file:', fileUrl, error);
  }
}
