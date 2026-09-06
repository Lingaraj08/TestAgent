import { describe, it, expect, beforeAll } from 'vitest';
import { encrypt, decrypt } from '@/lib/encryption';

describe('Encryption Utility', () => {
  beforeAll(() => {
    // Set a 32-byte (64 hex characters) test key
    process.env.ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  it('should successfully encrypt and decrypt a string', () => {
    const secret = 'sk-proj-test-api-key-1234567890';
    const encrypted = encrypt(secret);

    expect(encrypted).not.toBe(secret);
    expect(encrypted.split(':')).toHaveLength(3); // iv:authTag:encrypted

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(secret);
  });

  it('should produce different ciphertexts for the same plaintext due to random IV', () => {
    const text = 'my-secret-key';
    const enc1 = encrypt(text);
    const enc2 = encrypt(text);

    expect(enc1).not.toBe(enc2);
    expect(decrypt(enc1)).toBe(text);
    expect(decrypt(enc2)).toBe(text);
  });

  it('should throw error on invalid ciphertext format', () => {
    expect(() => decrypt('invalid-encrypted-text')).toThrow();
  });
});
