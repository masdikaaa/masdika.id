import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { migrateAllMediaToRustFS } from '@/lib/rustfs';

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const body = await req.json().catch(() => ({}));
    const deleteLocalAfterUpload = body.deleteLocalAfterUpload ?? true;

    const result = await migrateAllMediaToRustFS({ deleteLocalAfterUpload });

    return NextResponse.json({
      success: true,
      message: `Migration finished: ${result.migrated} migrated, ${result.skipped} already in RustFS, ${result.errors} errors (out of ${result.total} total).`,
      result
    });
  } catch (error: any) {
    console.error('Error during media migration to RustFS:', error);
    return NextResponse.json({
      success: false,
      message: error?.message || 'Failed to migrate media to RustFS'
    }, { status: 500 });
  }
}

