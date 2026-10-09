import crypto from 'crypto';

// Get keys from environment, fallback to a throw if not available in production
const getEncryptionKey = (): Buffer => {
  if (process.env.ENCRYPTION_KEY) return Buffer.from(process.env.ENCRYPTION_KEY, 'hex');
  if (process.env.NODE_ENV === 'production') throw new Error('ENCRYPTION_KEY is required in production');
  // Fallback for development if someone forgets to set it
  return crypto.createHash('sha256').update('fallback_secret_key_123').digest();
};

const getDeterministicIV = (): Buffer => {
  if (process.env.DETERMINISTIC_IV) return Buffer.from(process.env.DETERMINISTIC_IV, 'hex');
  if (process.env.NODE_ENV === 'production') throw new Error('DETERMINISTIC_IV is required in production');
  // Fallback 16 bytes for dev
  return crypto.createHash('md5').update('fallback_iv_123').digest();
};

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

/**
 * Hash a password using scrypt with a random salt.
 * This is highly resistant to brute-force and rainbow table attacks.
 */
export function hashPassword(password: string): string {
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
  if (!hash.includes(':')) {
    // Legacy SHA-256 fallback
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    return legacyHash === hash;
  }
  
  try {
    const [salt, key] = hash.split(':');
    const keyBuffer = Buffer.from(key, 'hex');
    
    // First try normal password (for newly changed passwords)
    const derivedKeyNormal = crypto.scryptSync(password, salt, 64);
    if (crypto.timingSafeEqual(keyBuffer, derivedKeyNormal)) return true;

    // Then try double-hashed password (for passwords migrated via script)
    const legacyHash = crypto.createHash('sha256').update(password).digest('hex');
    const derivedKeyLegacy = crypto.scryptSync(legacyHash, salt, 64);
    if (crypto.timingSafeEqual(keyBuffer, derivedKeyLegacy)) return true;

    return false;
  } catch (error) {
    return false;
  }
}
