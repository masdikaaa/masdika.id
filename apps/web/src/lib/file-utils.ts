import fs from 'fs';
import path from 'path';

/**
 * Deletes a file from the public/uploads directory given its URL.
 * Example URL: /uploads/banners/file-123.webp
 * @param fileUrl The URL/path stored in the database
 */
export function deleteLocalFile(fileUrl: string | null | undefined) {
  console.log('[deleteLocalFile] Called with fileUrl:', fileUrl);
  if (!fileUrl || !fileUrl.startsWith('/uploads/')) {
    console.log('[deleteLocalFile] Aborting: fileUrl is empty or does not start with /uploads/');
    return;
  }

  try {
    const filename = fileUrl.replace('/uploads/', '');
    
    const baseDir = path.resolve(process.cwd(), 'public', 'uploads');
    const filePath = path.resolve(baseDir, filename);

    console.log('[deleteLocalFile] baseDir:', baseDir);
    console.log('[deleteLocalFile] filePath:', filePath);

    // Bulletproof Path Traversal prevention
    // Ensure the resolved absolute path still resides within our base uploads directory
    if (!filePath.toLowerCase().startsWith(baseDir.toLowerCase())) {
      console.log('[deleteLocalFile] Aborting: Path traversal detected or case mismatch');
      return;
    }

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      console.log('[deleteLocalFile] Successfully deleted:', filePath);
    } else {
      console.log('[deleteLocalFile] File does not exist at:', filePath);
    }
  } catch (error) {
    console.error('Failed to delete local file:', fileUrl, error);
  }
}
