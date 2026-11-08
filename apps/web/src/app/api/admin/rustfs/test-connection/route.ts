import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { testRustFSConnection } from '@/lib/rustfs';

export async function POST(req: NextRequest) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });
  if (auth.impersonatedBy) return NextResponse.json({ error: 'Forbidden while impersonating' }, { status: 403 });

  try {
    const body = await req.json().catch(() => ({}));
    const result = await testRustFSConnection(body);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      message: error?.message || 'Failed to test RustFS connection'
    }, { status: 500 });
  }
}

