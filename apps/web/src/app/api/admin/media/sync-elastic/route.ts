import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { listPublicUploadsFromRustFS } from '@/lib/rustfs';
import { syncAllPublicImagesToElastic } from '@/lib/sync-elasticsearch';
import { getUploadsDir } from '@/lib/file-utils';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function POST() {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const mediaMap = new Map<string, { name: string; url: string; createdAt: Date; size: number }>();

    // 1. RustFS
    try {
      const rustItems = await listPublicUploadsFromRustFS();
      for (const item of rustItems) {
        mediaMap.set(item.url, {
          name: item.name,
          url: item.url,
          createdAt: item.lastModified,
          size: item.size
        });
      }
    } catch (err) {
      console.warn('[Sync Elastic Media] RustFS list warning:', err);
    }

    // 2. Local uploads
    try {
      const subFolders = ['media', 'banners', 'jobs', 'projects', ''];
      for (const sub of subFolders) {
        const dir = sub ? getUploadsDir(sub) : getUploadsDir();
        if (!fs.existsSync(dir)) continue;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile() || entry.name === '.gitkeep') continue;
          if (!/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(entry.name)) continue;
          const url = sub ? `/uploads/${sub}/${entry.name}` : `/uploads/${entry.name}`;
          if (!mediaMap.has(url)) {
            const stats = fs.statSync(path.join(dir, entry.name));
            mediaMap.set(url, {
              name: entry.name,
              url,
              createdAt: stats.mtime,
              size: stats.size
            });
          }
        }
      }
    } catch (err) {
      console.warn('[Sync Elastic Media] Local scan warning:', err);
    }

    const items = Array.from(mediaMap.values());
    const result = await syncAllPublicImagesToElastic(items);

    return NextResponse.json({
      success: true,
      message: `Successfully synchronized ${result.count} images to Elasticsearch`,
      count: result.count
    });
  } catch (error: any) {
    console.error('Error syncing public media to Elasticsearch:', error);
    return NextResponse.json({ error: 'Failed to sync media to Elasticsearch' }, { status: 500 });
  }
}

