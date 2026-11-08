import crypto from 'crypto';

const getSessionSecret = () => process.env.SESSION_SECRET || 'dev_fallback_session_secret_do_not_use_in_production';

const DEFAULT_MAX_AGE = 60 * 60 * 24; // 24 hours
const REMEMBER_ME_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface SessionPayload {
  userId: number;
  role?: string;
  sessionId?: string;
  impersonatedBy?: number;
  iat: number; // issued at (epoch seconds)
  exp: number; // expiration (epoch seconds)
}

export interface SessionTokenOptions {
  customMaxAgeSec?: number;
  impersonatedBy?: number;
}

function assertProductionSecret(secret: string) {
  if (
    process.env.NODE_ENV === 'production' &&
    (!process.env.SESSION_SECRET || secret === 'dev_fallback_session_secret_do_not_use_in_production')
  ) {
    throw new Error(
      'CRITICAL SECURITY ERROR: SESSION_SECRET environment variable is missing. You must provide a strong secret in production to prevent session forgery.'
    );
  }
}

/**
 * Domain-separated HMAC helper so non-session tokens (comment verify, 2FA challenge, unsubscribe)
 * can never collide with or forge session cookies even if sharing SESSION_SECRET.
 */
export function signDomainToken(domain: string, data: string): string {
  const secret = getSessionSecret();
  assertProductionSecret(secret);
  const subkey = crypto.createHmac('sha256', secret).update(`masdika-domain:${domain}`).digest();
  return crypto.createHmac('sha256', subkey).update(data).digest('hex');
}

export function verifyDomainToken(domain: string, data: string, signature: string | undefined | null): boolean {
  if (!signature || typeof signature !== 'string' || !/^[0-9a-f]{64}$/i.test(signature)) return false;
  const expected = signDomainToken(domain, data);
  const sigBuf = Buffer.from(signature.toLowerCase(), 'hex');
  const expBuf = Buffer.from(expected, 'hex');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

export interface TwoFactorChallengePayload {
  purpose: '2fa_challenge';
  userId: number;
  rememberMe: boolean;
  iat: number;
  exp: number;
}

export function create2FAChallengeToken(userId: number, rememberMe: boolean = false): string {
  const now = Math.floor(Date.now() / 1000);
  const payload: TwoFactorChallengePayload = {
    purpose: '2fa_challenge',
    userId,
    rememberMe,
    iat: now,
    exp: now + 300, // 5 minutes
  };
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = signDomainToken('2fa-challenge', payloadBase64);
  return `${payloadBase64}.${sig}`;
}

export function verify2FAChallengeToken(token: string | undefined | null): TwoFactorChallengePayload | null {
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [payloadBase64, sig] = parts;
  if (!verifyDomainToken('2fa-challenge', payloadBase64, sig)) return null;
  try {
    const parsed = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (parsed?.purpose !== '2fa_challenge') return null;
    if (!Number.isSafeInteger(parsed.userId) || parsed.userId <= 0) return null;
    if (typeof parsed.exp !== 'number' || now > parsed.exp) return null;
    return {
      purpose: '2fa_challenge',
      userId: parsed.userId,
      rememberMe: Boolean(parsed.rememberMe),
      iat: parsed.iat,
      exp: parsed.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Create a signed session token using HMAC-SHA256.
 * Token format: base64url(JSON payload) + "." + HMAC signature
 */
export function createSessionToken(
  userId: number, 
  role: string, 
  rememberMe: boolean = false, 
  sessionId?: string,
  options?: SessionTokenOptions
): { token: string; maxAge: number; sessionId: string } {
  // STRICT RUNTIME SECURITY CHECK: Ensure production doesn't use the fallback secret
  const secret = getSessionSecret();
  assertProductionSecret(secret);

  const maxAge = options?.customMaxAgeSec ?? (rememberMe ? REMEMBER_ME_MAX_AGE : DEFAULT_MAX_AGE);
  const now = Math.floor(Date.now() / 1000);
  const activeSessionId = sessionId || crypto.randomUUID();

  const payload: SessionPayload = {
    userId,
    role,
    sessionId: activeSessionId,
    ...(options?.impersonatedBy ? { impersonatedBy: options.impersonatedBy } : {}),
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
    sessionId: activeSessionId,
  };
}

/**
 * Extract and securely verify full session payload from a signed session token.
 */
export function getSessionPayload(token: string | undefined | null): SessionPayload | null {
  // STRICT RUNTIME SECURITY CHECK
  const secret = getSessionSecret();
  assertProductionSecret(secret);

  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;

  const [payloadBase64, signature] = parts;
  if (!/^[0-9a-f]{64}$/i.test(signature)) return null;

  // Verify HMAC signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payloadBase64)
    .digest('hex');

  // Use timing-safe comparison to prevent timing attacks
  if (signature.length !== expectedSignature.length) return null;
  
  const sigBuffer = Buffer.from(signature.toLowerCase(), 'hex');
  const expectedBuffer = Buffer.from(expectedSignature, 'hex');

  if (sigBuffer.length !== expectedBuffer.length) return null;
  if (!crypto.timingSafeEqual(sigBuffer, expectedBuffer)) return null;

  try {
    const payloadJson = Buffer.from(payloadBase64, 'base64url').toString('utf-8');
    const payload: any = JSON.parse(payloadJson);

    if (!payload || typeof payload !== 'object' || payload.purpose) return null;

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (typeof payload.exp !== 'number' || typeof payload.iat !== 'number') return null;
    if (now > payload.exp) return null;

    // Validate userId
    if (!Number.isSafeInteger(payload.userId) || payload.userId <= 0) return null;

    return payload as SessionPayload;
  } catch {
    return null;
  }
}

/**
 * Verify a signed session token. Returns the userId if valid, null otherwise.
 */
export function verifySessionToken(token: string | undefined | null): number | null {
  return getSessionPayload(token)?.userId ?? null;
}
