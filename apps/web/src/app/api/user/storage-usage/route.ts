import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth-middleware';
import { getStorageUsage } from '@/lib/billing-limits';

export async function GET(req: Request) {
  const auth = await requireAuth({ allowedRoles: ['ADMIN', 'USER'] });
  if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

  try {
    const usage = await getStorageUsage(auth.userId!);
    return NextResponse.json({ success: true, data: usage });
  } catch (error: any) {
    console.error("Storage Usage Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
