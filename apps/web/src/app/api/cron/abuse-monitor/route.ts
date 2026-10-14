import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    success: true,
    message: 'Abuse monitor automated locking is deprecated and disabled in favor of Admin Resource Finding.',
    active: false,
  });
}

