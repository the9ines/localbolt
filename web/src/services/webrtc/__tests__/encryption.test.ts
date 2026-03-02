import { describe, it, expect } from 'vitest';
import {
  sealBoxPayload,
  openBoxPayload,
  generateEphemeralKeyPair,
} from '@the9ines/bolt-core';

describe('NaCl box encryption (SDK canonical)', () => {
  it('encrypts and decrypts a chunk correctly', () => {
    const alice = generateEphemeralKeyPair();
    const bob = generateEphemeralKeyPair();

    const plaintext = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const encrypted = sealBoxPayload(plaintext, bob.publicKey, alice.secretKey);
    const decrypted = openBoxPayload(encrypted, alice.publicKey, bob.secretKey);

    expect(decrypted).toEqual(plaintext);
  });

  it('produces different ciphertext for same plaintext (random nonce)', () => {
    const alice = generateEphemeralKeyPair();
    const bob = generateEphemeralKeyPair();

    const plaintext = new Uint8Array([10, 20, 30]);
    const enc1 = sealBoxPayload(plaintext, bob.publicKey, alice.secretKey);
    const enc2 = sealBoxPayload(plaintext, bob.publicKey, alice.secretKey);

    expect(enc1).not.toEqual(enc2);
  });

  it('fails to decrypt with wrong key', () => {
    const alice = generateEphemeralKeyPair();
    const bob = generateEphemeralKeyPair();
    const eve = generateEphemeralKeyPair();

    const plaintext = new Uint8Array([42, 43, 44]);
    const encrypted = sealBoxPayload(plaintext, bob.publicKey, alice.secretKey);

    expect(() => {
      openBoxPayload(encrypted, eve.publicKey, bob.secretKey);
    }).toThrow();
  });

  it('handles empty chunk', () => {
    const alice = generateEphemeralKeyPair();
    const bob = generateEphemeralKeyPair();

    const plaintext = new Uint8Array([]);
    const encrypted = sealBoxPayload(plaintext, bob.publicKey, alice.secretKey);
    const decrypted = openBoxPayload(encrypted, alice.publicKey, bob.secretKey);

    expect(decrypted).toEqual(plaintext);
  });

  it('handles 16KB chunk (actual transfer size)', () => {
    const alice = generateEphemeralKeyPair();
    const bob = generateEphemeralKeyPair();

    const plaintext = new Uint8Array(16384);
    for (let i = 0; i < plaintext.length; i++) {
      plaintext[i] = i % 256;
    }

    const encrypted = sealBoxPayload(plaintext, bob.publicKey, alice.secretKey);
    const decrypted = openBoxPayload(encrypted, alice.publicKey, bob.secretKey);

    expect(decrypted).toEqual(plaintext);
  });

  it('key pairs are different each time', () => {
    const kp1 = generateEphemeralKeyPair();
    const kp2 = generateEphemeralKeyPair();
    expect(kp1.publicKey).not.toEqual(kp2.publicKey);
    expect(kp1.secretKey).not.toEqual(kp2.secretKey);
  });

  it('nonce is embedded in sealed payload (24 bytes prefix)', () => {
    const alice = generateEphemeralKeyPair();
    const bob = generateEphemeralKeyPair();
    const plaintext = new Uint8Array([1, 2, 3]);
    const sealed = sealBoxPayload(plaintext, bob.publicKey, alice.secretKey);

    // Decode base64 and verify nonce prefix exists (>= 24 bytes)
    const decoded = Uint8Array.from(atob(sealed), c => c.charCodeAt(0));
    expect(decoded.length).toBeGreaterThanOrEqual(24);
  });

  it('public key is 32 bytes', () => {
    const kp = generateEphemeralKeyPair();
    expect(kp.publicKey.length).toBe(32);
    expect(kp.secretKey.length).toBe(32);
  });
});
