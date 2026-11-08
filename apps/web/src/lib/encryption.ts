import crypto from 'crypto';

// Get keys from environment, fallback to a throw if not available in production
const getEncryptionKey = (): Buffer => {
  if (process.env.ENCRYPTION_KEY) {
    const buf = Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
    if (buf.length === 32) return buf;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('ENCRYPTION_KEY must be a 64-character hex string (32 bytes)');
    }
  }
  if (process.env.NODE_ENV === 'production') throw new Error('ENCRYPTION_KEY is required in production');
  // Fallback for development if someone forgets to set it
  return crypto.createHash('sha256').update('fallback_secret_key_123').digest();
};

const getDeterministicIV = (): Buffer => {
  if (process.env.DETERMINISTIC_IV) {
    const buf = Buffer.from(process.env.DETERMINISTIC_IV, 'hex');
    if (buf.length === 16) return buf;
    if (process.env.NODE_ENV === 'production') {
      throw new Error('DETERMINISTIC_IV must be a 32-character hex string (16 bytes)');
    }
  }
  if (process.env.NODE_ENV === 'production') throw new Error('DETERMINISTIC_IV is required in production');
  // Fallback 16 bytes for dev
  return crypto.createHash('md5').update('fallback_iv_123').digest();
};

const deriveContextKey = (context: string): Buffer => {
  return Buffer.from(
    crypto.hkdfSync('sha256', getEncryptionKey(), Buffer.alloc(0), Buffer.from(`masdika:${context}`, 'utf8'), 32)
  );
};

/**
 * Authenticated Encryption (AES-256-GCM with random 96-bit IV and HKDF domain separation).
 * Use for ephemeral secrets/tokens (e.g. VNC hypervisor tickets) that must not be malleable.
 */
export function encryptAuthenticated(text: string, context: string = 'default'): string {
  const key = deriveContextKey(context);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `gcm:${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptAuthenticated(payload: string | null | undefined, context: string = 'default'): string | null {
  if (!payload || typeof payload !== 'string' || !payload.startsWith('gcm:')) return null;
  const parts = payload.split(':');
  if (parts.length !== 4) return null;
  try {
    const iv = Buffer.from(parts[1], 'hex');
    const tag = Buffer.from(parts[2], 'hex');
    const ciphertext = Buffer.from(parts[3], 'hex');
    if (iv.length !== 12 || tag.length !== 16) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', deriveContextKey(context), iv);
    decipher.setAuthTag(tag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString('utf8');
  } catch {
    return null;
  }
}

/**
 * Deterministic Encryption (AES-256-CBC with static IV).
 * Used for fields that need to be searchable or have @unique constraints (e.g. Email).
 * Identical plaintext will ALWAYS produce the identical ciphertext.
 */
export function encryptDeterministic(text: string | null | undefined): string {
  if (!text) return text as any;
  try {
    const cipher = crypto.createCipheriv('aes-256-cbc', getEncryptionKey(), getDeterministicIV());
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    // We prefix with 'enc:' so we can easily identify already encrypted data during migration/reads
    return `enc:${encrypted}`;
  } catch (error) {
    console.error('Encryption error:', error);
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Failed to encrypt sensitive field');
    }
    return text;
  }
}

export function decryptDeterministic(encryptedText: string | null | undefined): string {
  if (!encryptedText) return encryptedText as any;
  // If it doesn't start with our prefix, it might be legacy plaintext
  if (!encryptedText.startsWith('enc:')) return encryptedText;
  
  try {
    const hexData = encryptedText.substring(4);
    const decipher = crypto.createDecipheriv('aes-256-cbc', getEncryptionKey(), getDeterministicIV());
    let decrypted = decipher.update(hexData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    // Fallback to returning original if decryption fails (e.g. key rotated/lost)
    return encryptedText;
  }
}

const MAX_PASSWORD_BYTES = 256;

/**
 * Hash a password using scrypt with a random salt.
 * This is highly resistant to brute-force and rainbow table attacks.
 */
export function hashPassword(password: string): string {
  if (typeof password !== 'string' || Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) {
    throw new Error('Password exceeds maximum allowed length');
  }
  const salt = crypto.randomBytes(16).toString('hex');
  // 64 bytes derived key length
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derivedKey}`;
}

/**
 * Verify a password against a hash.
 * Supports gracefully falling back to legacy SHA-256 hashes for unmigrated data.
 */
export function verifyPassword(password: string, hash: string): boolean {
  if (typeof password !== 'string' || typeof hash !== 'string' || !hash) return false;
  if (Buffer.byteLength(password, 'utf8') > MAX_PASSWORD_BYTES) return false;

  if (!hash.includes(':')) {
    // Legacy SHA-256 fallback (constant-time compare)
    if (!/^[0-9a-f]{64}$/i.test(hash)) return false;
    const legacyBuf = crypto.createHash('sha256').update(password).digest();
    const targetBuf = Buffer.from(hash, 'hex');
    if (legacyBuf.length !== targetBuf.length) return false;
    return crypto.timingSafeEqual(legacyBuf, targetBuf);
  }
  
  try {
    const [salt, key] = hash.split(':');
    if (!salt || !key || !/^[0-9a-f]+$/i.test(key)) return false;
    const keyBuffer = Buffer.from(key, 'hex');
    if (keyBuffer.length !== 64) return false;
    
    // First try normal password (for newly changed passwords)
    const derivedKeyNormal = crypto.scryptSync(password, salt, 64);
    if (crypto.timingSafeEqual(keyBuffer, derivedKeyNormal)) return true;

    // Then try double-hashed password (for passwords migrated via script)
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    const derivedKeyLegacy = crypto.scryptSync(legacyHash, salt, 64);
    if (crypto.timingSafeEqual(keyBuffer, derivedKeyLegacy)) return true;

    return false;
  } catch {
    return false;
  }
}
