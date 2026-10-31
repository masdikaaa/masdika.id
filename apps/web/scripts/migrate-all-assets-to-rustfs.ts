import { prisma } from '../src/lib/prisma';
import {
  getRustFSConfig,
  getRustFSS3Client,
  getRustFSTicketClient,
  ensureBucketExists,
  uploadTicketAttachmentToRustFS,
  checkTicketAttachmentInRustFS,
  uploadPublicUploadToRustFS,
  downloadPublicUploadFromRustFS,
  invalidateRustFSCache
} from '../src/lib/rustfs';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('=== [1/4] Seeding rustfs_ticket_bucket in database ===');
  await prisma.setting.upsert({
    where: { key: 'rustfs_ticket_bucket' },
    update: { value: 'masdika-ticket' },
    create: { key: 'rustfs_ticket_bucket', value: 'masdika-ticket' }
  });
  invalidateRustFSCache();
  const config = await getRustFSConfig();
  console.log('RustFS Config:', {
    endpoint: config.endpoint,
    bucket: config.bucket,
    ticketBucket: config.ticketBucket,
    enabled: config.enabled
  });

  const { client: mediaClient, bucket: mediaBucket } = await getRustFSS3Client();
  const { client: ticketClient, bucket: ticketBucket } = await getRustFSTicketClient();
  await ensureBucketExists(mediaClient, mediaBucket);
  await ensureBucketExists(ticketClient, ticketBucket);
  console.log(`Buckets verified: '${mediaBucket}' and '${ticketBucket}'`);

  console.log('\n=== [2/4] Migrating Ticket Attachments to RustFS (masdika-ticket) ===');
  const ticketAttachments = await prisma.ticketAttachment.findMany();
  console.log(`Found ${ticketAttachments.length} ticket attachments in database.`);

  const candidateTicketDirs = [
    path.join(process.cwd(), 'apps', 'web', 'storage', 'tickets'),
    path.join(process.cwd(), 'storage', 'tickets'),
    path.resolve(__dirname, '../storage/tickets'),
    path.resolve(__dirname, '../../storage/tickets'),
    '/app/apps/web/storage/tickets'
  ].filter((d, i, arr) => arr.indexOf(d) === i && fs.existsSync(d));

  let ticketsMigrated = 0;
  let ticketsSkipped = 0;

  for (const att of ticketAttachments) {
    const existsInRust = await checkTicketAttachmentInRustFS(att.filename);
    if (existsInRust) {
      console.log(`[Ticket] Already in RustFS: ${att.filename} (${att.originalName})`);
      ticketsSkipped++;
    } else {
      let localPath: string | null = null;
      for (const dir of candidateTicketDirs) {
        const p = path.join(dir, att.filename);
        if (fs.existsSync(p)) {
          localPath = p;
          break;
        }
      }

      if (!localPath) {
        console.warn(`[Ticket Warning] File not found on disk for DB record: ${att.filename}`);
        continue;
      }

      const buffer = fs.readFileSync(localPath);
      await uploadTicketAttachmentToRustFS(att.filename, buffer, att.mimeType || 'application/octet-stream');
      const verified = await checkTicketAttachmentInRustFS(att.filename);
      if (!verified) {
        throw new Error(`[Ticket Error] Failed to verify ${att.filename} in RustFS ticket bucket!`);
      }
      console.log(`[Ticket] Successfully migrated to RustFS: ${att.filename} (${(buffer.length / 1024).toFixed(1)} KB)`);
      ticketsMigrated++;
    }

    // Safely remove local file after verification
    for (const dir of candidateTicketDirs) {
      const p = path.join(dir, att.filename);
      if (fs.existsSync(p)) {
        try {
          fs.unlinkSync(p);
          console.log(`[Ticket Cleanup] Removed local file: ${p}`);
        } catch (e) {
          console.warn(`[Ticket Cleanup Warning] Could not remove ${p}:`, e);
        }
      }
    }
  }

  // Remove empty storage/tickets folder if no files remain
  for (const dir of candidateTicketDirs) {
    try {
      if (fs.existsSync(dir)) {
        const remaining = fs.readdirSync(dir);
        if (remaining.length === 0) {
          fs.rmdirSync(dir);
          console.log(`[Ticket Cleanup] Removed empty directory: ${dir}`);
        }
      }
    } catch {}
  }

  console.log(`Ticket Attachments migration done: ${ticketsMigrated} migrated, ${ticketsSkipped} already in RustFS.`);

  console.log('\n=== [3/4] Migrating Public Uploads to RustFS (masdika-media) ===');
  const candidateUploadsDirs = [
    path.join(process.cwd(), 'apps', 'web', 'public', 'uploads'),
    path.join(process.cwd(), 'public', 'uploads'),
    path.resolve(__dirname, '../public/uploads'),
    path.resolve(__dirname, '../../public/uploads')
  ].filter((d, i, arr) => arr.indexOf(d) === i && fs.existsSync(d));

  let uploadsMigrated = 0;
  let uploadsSkipped = 0;

  function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);
    for (const file of files) {
      const fullPath = path.join(dirPath, file);
      if (fs.statSync(fullPath).isDirectory()) {
        getAllFiles(fullPath, arrayOfFiles);
      } else {
        arrayOfFiles.push(fullPath);
      }
    }
    return arrayOfFiles;
  }

  for (const baseUploadsDir of candidateUploadsDirs) {
    const allFiles = getAllFiles(baseUploadsDir);
    console.log(`Found ${allFiles.length} files in ${baseUploadsDir}`);

    for (const fullPath of allFiles) {
      const relPath = path.relative(baseUploadsDir, fullPath).replace(/\\/g, '/');
      const ext = path.extname(fullPath).toLowerCase();
      let mime = 'application/octet-stream';
      if (ext === '.webp') mime = 'image/webp';
      else if (ext === '.png') mime = 'image/png';
      else if (ext === '.jpg' || ext === '.jpeg') mime = 'image/jpeg';
      else if (ext === '.gif') mime = 'image/gif';
      else if (ext === '.pdf') mime = 'application/pdf';

      const existing = await downloadPublicUploadFromRustFS(relPath);
      if (existing) {
        console.log(`[Public Upload] Already in RustFS: ${relPath}`);
        uploadsSkipped++;
      } else {
        const buffer = fs.readFileSync(fullPath);
        await uploadPublicUploadToRustFS(relPath, buffer, mime);
        const verified = await downloadPublicUploadFromRustFS(relPath);
        if (!verified) {
          throw new Error(`[Public Upload Error] Failed to verify ${relPath} in RustFS!`);
        }
        console.log(`[Public Upload] Successfully migrated to RustFS: ${relPath} (${(buffer.length / 1024).toFixed(1)} KB)`);
        uploadsMigrated++;
      }

      // Safely delete local file after verification
      try {
        fs.unlinkSync(fullPath);
        console.log(`[Uploads Cleanup] Removed local file: ${fullPath}`);
      } catch (e) {
        console.warn(`[Uploads Cleanup Warning] Could not remove ${fullPath}:`, e);
      }
    }
  }

  console.log(`Public Uploads migration done: ${uploadsMigrated} migrated, ${uploadsSkipped} already in RustFS.`);

  console.log('\n=== [4/4] Verification Summary ===');
  console.log(`✓ Database seed: rustfs_ticket_bucket = 'masdika-ticket'`);
  console.log(`✓ Ticket attachments: ${ticketsMigrated + ticketsSkipped} verified in RustFS`);
  console.log(`✓ Public uploads: ${uploadsMigrated + uploadsSkipped} verified in RustFS`);
  console.log(`✓ Local storage folders cleaned for lean CI/CD deployment!`);

  process.exit(0);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

