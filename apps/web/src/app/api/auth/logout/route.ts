import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSessionPayload } from '@/lib/session';
import { prisma } from '@/lib/prisma';

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('admin_session')?.value;
    const payload = getSessionPayload(token);

    if (payload?.sessionId && !payload.impersonatedBy) {
      await prisma.loginLog.updateMany({
        where: { sessionId: payload.sessionId },
        data: { isRevoked: true },
      }).catch(() => {});
    }
  } catch {
    // Always proceed with cookie cleanup even if DB is unreachable
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  // Clear session, impersonation, and 2FA challenge cookies
  response.cookies.delete('admin_session');
  response.cookies.delete('masdika_impersonator_token');
  response.cookies.delete('masdika_impersonating_info');
  response.cookies.delete('masdika_2fa_challenge');

  return response;
}
