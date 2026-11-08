import crypto from 'crypto';

/**
 * Verifies the `Authorization: Bearer <CRON_SECRET>` header in constant time.
 * Fails closed whenever CRON_SECRET is unset or empty.
 */
export function verifyCronSecret(req: Request): boolean {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return false;
  }

  const authHeader = req.headers.get('authorization');
  if (!authHeader || typeof authHeader !== 'string') {
    return false;
  }

  const expected = `Bearer ${cronSecret}`;
  const actualDigest = crypto.createHash('sha256').update(authHeader, 'utf8').digest();
  const expectedDigest = crypto.createHash('sha256').update(expected, 'utf8').digest();

  return crypto.timingSafeEqual(actualDigest, expectedDigest);
}

