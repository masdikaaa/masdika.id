import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { requireAuth } from '@/lib/auth-middleware';
import { getUploadsDir } from '@/lib/file-utils';
import { listPublicUploadsFromRustFS, deletePublicUploadFromRustFS } from '@/lib/rustfs';
import {
  searchPublicImagesElastic,
  syncAllPublicImagesToElastic,
  removePublicImageFromElastic
} from '@/lib/sync-elasticsearch';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const search = (searchParams.get('search') || searchParams.get('q') || '').trim();

    // 1. If searching, prioritize Elasticsearch fuzzy & keyword query
    if (search) {
      try {
        const elasticResults = await searchPublicImagesElastic(search, { limit: 150 });
        if (elasticResults !== null) {
          return NextResponse.json(elasticResults);
        }
      } catch (esErr) {
        console.warn('[Admin Media API] Elasticsearch search error, falling back:', esErr);
      }
    }

    // 2. Fetch full collection from RustFS masdika-media & local disk
    const mediaMap = new Map<string, {
      name: string;
      url: string;
      createdAt: Date | string;
      size: number;
    }>();

    // A. Primary: List from RustFS masdika-media bucket
    try {
      const rustFSItems = await listPublicUploadsFromRustFS();
      for (const item of rustFSItems) {
        mediaMap.set(item.url, {
          name: item.name,
          url: item.url,
          createdAt: item.lastModified,
          size: item.size
        });
      }
    } catch (rustErr) {
      console.warn('[Admin Media API] RustFS listing error:', rustErr);
    }

    // B. Fallback / Coexistence: Scan local uploads directory for any unmigrated files
    try {
      const candidateSubFolders = ['media', 'banners', 'jobs', 'projects', ''];
      for (const sub of candidateSubFolders) {
        const uploadsDir = sub ? getUploadsDir(sub) : getUploadsDir();
        if (!fs.existsSync(uploadsDir)) continue;

        const entries = fs.readdirSync(uploadsDir, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isFile() || entry.name === '.gitkeep') continue;
          if (!/\.(jpg|jpeg|png|gif|webp|svg|avif)$/i.test(entry.name)) continue;

          const url = sub ? `/uploads/${sub}/${entry.name}` : `/uploads/${entry.name}`;
          if (!mediaMap.has(url)) {
            try {
              const stats = fs.statSync(path.join(uploadsDir, entry.name));
              let date = stats.mtime;
              const tsMatch = entry.name.match(/[-_](\d{10,13})\.[a-zA-Z0-9]+$/);
              if (tsMatch) {
                const parsedTs = parseInt(tsMatch[1], 10);
                if (!isNaN(parsedTs) && parsedTs > 1000000000000) {
                  date = new Date(parsedTs);
                }
              }
              mediaMap.set(url, {
                name: entry.name,
                url,
                createdAt: date,
                size: stats.size
              });
            } catch {}
          }
        }
      }
    } catch (localErr) {
      console.warn('[Admin Media API] Local disk scanning error:', localErr);
    }

    let mediaFiles = Array.from(mediaMap.values());

    // If search was requested but Elasticsearch was degraded, filter in-memory
    if (search) {
      const lower = search.toLowerCase();
      mediaFiles = mediaFiles.filter(item =>
        item.name.toLowerCase().includes(lower) ||
        item.url.toLowerCase().includes(lower)
      );
    }

    mediaFiles.sort((a, b) => {
      const timeA = new Date(a.createdAt).getTime();
      const timeB = new Date(b.createdAt).getTime();
      return timeB - timeA;
    });

    // Auto-sync into Elasticsearch in background when initial list is loaded without search
    if (!search && mediaFiles.length > 0) {
      syncAllPublicImagesToElastic(mediaFiles).catch(() => {});
    }

    return NextResponse.json(mediaFiles);
  } catch (error) {
    console.error('Error fetching media:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get('filename');
    const url = searchParams.get('url');

    if (!filename && !url) {
      return NextResponse.json({ error: 'Filename or url is required' }, { status: 400 });
    }

    // Security check to prevent path traversal
    if (filename && (filename.includes('..') || filename.includes('\\'))) {
      return NextResponse.json({ error: 'Invalid filename' }, { status: 400 });
    }
    if (url && (url.includes('..') || url.includes('\\'))) {
      return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
    }

    // 1. Delete by explicit URL (e.g. /uploads/media/foo.webp)
    if (url && url.startsWith('/uploads/')) {
      const cleanSubPath = url.replace(/^\/uploads\//, '');
      const localPath = path.join(getUploadsDir(), cleanSubPath);
      if (fs.existsSync(localPath)) {
        try { fs.unlinkSync(localPath); } catch {}
      }
      try {
        await deletePublicUploadFromRustFS(cleanSubPath);
      } catch {}
      removePublicImageFromElastic(url).catch(() => {});
    }

    // 2. Delete by filename across candidate locations
    if (filename) {
      const safeFilename = path.basename(filename);
      const candidateFolders = ['media', 'banners', 'jobs', 'projects', ''];

      for (const sub of candidateFolders) {
        // Local disk
        const localPath = sub ? getUploadsDir(sub, safeFilename) : getUploadsDir(safeFilename);
        if (fs.existsSync(localPath)) {
          try { fs.unlinkSync(localPath); } catch {}
        }
        // RustFS S3
        const relativeKey = sub ? `${sub}/${safeFilename}` : safeFilename;
        try {
          await deletePublicUploadFromRustFS(relativeKey);
        } catch {}
      }
      removePublicImageFromElastic(safeFilename).catch(() => {});
    }

    return NextResponse.json({ success: true, message: 'Media deleted successfully' });
  } catch (error) {
    console.error('Error deleting media:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
