import crypto from 'crypto';

const getSessionSecret = () => process.env.SESSION_SECRET || 'dev_fallback_session_secret_do_not_use_in_production';

const DEFAULT_MAX_AGE = 60 * 60 * 24; // 24 hours
const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

interface SessionPayload {
  userId: number;
  role?: string;
  iat: number; // issued at (epoch seconds)
  exp: number; // expiration (epoch seconds)
}

/**
 * Create a signed session token using HMAC-SHA256.
 * Token format: base64url(JSON payload) + "." + HMAC signature
 */
export function createSessionToken(userId: number, role: string, rememberMe: boolean = false): { token: string; maxAge: number } {
  // STRICT RUNTIME SECURITY CHECK: Ensure production doesn't use the fallback secret
  const secret = getSessionSecret();
  if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || secret === 'dev_fallback_session_secret_do_not_use_in_production')) {
    throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET environment variable is missing. You must provide a strong secret in production to prevent session forgery.');
  }

  const maxAge = rememberMe ? REMEMBER_ME_MAX_AGE : DEFAULT_MAX_AGE;
  const now = Math.floor(Date.now() / 1000);

  const payload: SessionPayload = {
    userId,
    role,
    iat: now,
    exp: now + maxAge,
  };

  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('hex');

  return {
    token: `${payloadBase64}.${signature}`,
    maxAge,
  };
}

/**
 * Verify a signed session token. Returns the userId if valid, null otherwise.
 */
export function verifySessionToken(token: string | undefined | null): number | null {
  // STRICT RUNTIME SECURITY CHECK
  const secret = getSessionSecret();
  if (process.env.NODE_ENV === 'production' && (!process.env.SESSION_SECRET || secret === 'dev_fallback_session_secret_do_not_use_in_production')) {
    throw new Error('CRITICAL SECURITY ERROR: SESSION_SECRET is missing. The system cannot safely verify sessions.');
  }

  if (!token) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) return null;
  
  const sigBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload: SessionPayload = JSON.parse(payloadJson);

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) return null;

    // Validate userId
    if (!payload.userId || typeof payload.userId !== 'number') return null;

    return payload.userId;
  } catch {
    return null;
  }
}
