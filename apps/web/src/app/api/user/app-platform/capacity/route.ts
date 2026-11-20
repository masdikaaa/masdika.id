import { NextResponse } from 'next/server';
import { checkAppPlatformCapacity } from '@/lib/k8s-app-platform';
import { isServiceEnabled } from '@/lib/service-availability';

export async function GET() {
  try {
    const enabled = await isServiceEnabled('app_platform_enabled');
    const capacity = await checkAppPlatformCapacity();
    return NextResponse.json({
      success: true,
      data: {
        ...capacity,
        serviceEnabled: enabled,
      },
    });
  } catch (error: any) {
    console.error('[AppPlatform] Error checking capacity:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
