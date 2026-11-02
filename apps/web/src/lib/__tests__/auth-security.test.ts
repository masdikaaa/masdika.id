import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword, encryptDeterministic, decryptDeterministic } from '../encryption';
import crypto from 'crypto';

describe('Authentication Security - Password Hashing (scrypt & legacy fallback)', () => {
  it('should generate a salted scrypt hash in format <salt>:<derivedKey>', () => {
    const rawPass = 'SuperSecureP@ssw0rd!2026';
    const hash = hashPassword(rawPass);

    expect(hash).toContain(':');
    const [salt, key] = hash.split(':');
    expect(salt).toBeDefined();
    expect(key).toBeDefined();
    expect(salt.length).toBe(32); // 16 bytes hex = 32 chars
    expect(key.length).toBe(128);  // 64 bytes hex = 128 chars
  });

  it('should correctly verify valid password against scrypt hash', () => {
    const rawPass = 'ValidSecret123!';
    const hash = hashPassword(rawPass);

    expect(verifyPassword(rawPass, hash)).toBe(true);
  });

  it('should reject invalid password against scrypt hash', () => {
    const rawPass = 'CorrectPassword';
    const wrongPass = 'WrongPassword';
    const hash = hashPassword(rawPass);

    expect(verifyPassword(wrongPass, hash)).toBe(false);
  });

  it('should support legacy SHA-256 password fallback verification', () => {
    const rawPass = 'LegacyAdminPass123';
    const legacyHash = crypto.createHash('sha256').update(rawPass).digest('hex');

    // Does not contain ':' -> triggers legacy path
    expect(verifyPassword(rawPass, legacyHash)).toBe(true);
    expect(verifyPassword('WrongPass', legacyHash)).toBe(false);
  });

  it('should safely reject corrupted or malformed hashes without crashing', () => {
    expect(verifyPassword('password', 'malformed-hash-without-valid-hex')).toBe(false);
    expect(verifyPassword('password', '')).toBe(false);
  });
});

describe('Field Level Security - AES-256 Deterministic Encryption', () => {
  it('should encrypt string with enc: prefix', () => {
    const email = 'user@masdika.id';
    const encrypted = encryptDeterministic(email);

    expect(encrypted).toBeDefined();
    expect(encrypted).not.toBe(email);
    expect(encrypted.startsWith('enc:')).toBe(true);
  });

  it('should be deterministic (identical input produces identical ciphertext for searchable indexing)', () => {
    const email = 'searchable.admin@masdika.id';
    const enc1 = encryptDeterministic(email);
    const enc2 = encryptDeterministic(email);

    expect(enc1).toBe(enc2);
  });

  it('should decrypt ciphertext back to original plaintext', () => {
    const secretData = 'Confidential_User_Identifier_98765';
    const encrypted = encryptDeterministic(secretData);
    const decrypted = decryptDeterministic(encrypted);

    expect(decrypted).toBe(secretData);
  });

  it('should return null or undefined as-is', () => {
    expect(encryptDeterministic(null as any)).toBe(null);
    expect(encryptDeterministic(undefined as any)).toBe(undefined);
    expect(decryptDeterministic(null as any)).toBe(null);
    expect(decryptDeterministic(undefined as any)).toBe(undefined);
  });

  it('should return plaintext as-is if string does not have enc: prefix', () => {
    const unencryptedText = 'plain-unencrypted-legacy-string';
    expect(decryptDeterministic(unencryptedText)).toBe(unencryptedText);
  });
});

