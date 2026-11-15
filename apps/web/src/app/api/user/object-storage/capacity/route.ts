import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getObjectStorageClusterCapacity } from '@/lib/customer-rustfs';

export async function GET() {
  const authResult = await requireAuth({ allowedRoles: ['USER', 'ADMIN'] });
  if (authResult.error) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status });
  }

  const capacity = await getObjectStorageClusterCapacity();
  return NextResponse.json({
    success: true,
    data: capacity,
  });
}
