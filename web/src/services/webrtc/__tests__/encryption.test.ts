import { describe, it, expect } from 'vitest';
import { box, randomBytes } from 'tweetnacl';
import { encodeBase64 } from 'tweetnacl-util';

// These mirror the encryption functions in WebRTCService.ts
function encryptChunk(
  chunk: Uint8Array,
  remotePublicKey: Uint8Array,
  secretKey: Uint8Array
): string {
  const nonce = randomBytes(box.nonceLength);
  const encrypted = box(chunk, nonce, remotePublicKey, secretKey);
  if (!encrypted) throw new Error('Encryption returned null');
  const combined = new Uint8Array(nonce.length + encrypted.length);
  combined.set(nonce);
  combined.set(encrypted, nonce.length);
  return btoa(String.fromCharCode(...combined));
}

function decryptChunk(
  base64: string,
  remotePublicKey: Uint8Array,
  secretKey: Uint8Array
): Uint8Array {
  const data = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const nonce = data.slice(0, box.nonceLength);
  const ciphertext = data.slice(box.nonceLength);
  const decrypted = box.open(ciphertext, nonce, remotePublicKey, secretKey);
  if (!decrypted) throw new Error('Decryption failed');
  return decrypted;
}

describe('NaCl box encryption', () => {
  it('encrypts and decrypts a chunk correctly', () => {
    const alice = box.keyPair();
    const bob = box.keyPair();

    const plaintext = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const encrypted = encryptChunk(plaintext, bob.publicKey, alice.secretKey);
    const decrypted = decryptChunk(encrypted, alice.publicKey, bob.secretKey);

    expect(decrypted).toEqual(plaintext);
  });

  it('produces different ciphertext for same plaintext (random nonce)', () => {
    const alice = box.keyPair();
    const bob = box.keyPair();

    const plaintext = new Uint8Array([10, 20, 30]);
    const enc1 = encryptChunk(plaintext, bob.publicKey, alice.secretKey);
    const enc2 = encryptChunk(plaintext, bob.publicKey, alice.secretKey);

    expect(enc1).not.toEqual(enc2);
  });

  it('fails to decrypt with wrong key', () => {
    const alice = box.keyPair();
    const bob = box.keyPair();
    const eve = box.keyPair();

    const plaintext = new Uint8Array([42, 43, 44]);
    const encrypted = encryptChunk(plaintext, bob.publicKey, alice.secretKey);

    expect(() => {
      decryptChunk(encrypted, eve.publicKey, bob.secretKey);
    }).toThrow('Decryption failed');
  });

  it('handles empty chunk', () => {
    const alice = box.keyPair();
    const bob = box.keyPair();

    const plaintext = new Uint8Array([]);
    const encrypted = encryptChunk(plaintext, bob.publicKey, alice.secretKey);
    const decrypted = decryptChunk(encrypted, alice.publicKey, bob.secretKey);

    expect(decrypted).toEqual(plaintext);
  });

  it('handles 16KB chunk (actual transfer size)', () => {
    const alice = box.keyPair();
    const bob = box.keyPair();

    const plaintext = new Uint8Array(16384);
    for (let i = 0; i < plaintext.length; i++) {
      plaintext[i] = i % 256;
    }

    const encrypted = encryptChunk(plaintext, bob.publicKey, alice.secretKey);
    const decrypted = decryptChunk(encrypted, alice.publicKey, bob.secretKey);

    expect(decrypted).toEqual(plaintext);
  });

  it('key pairs are different each time', () => {
    const kp1 = box.keyPair();
    const kp2 = box.keyPair();
    expect(encodeBase64(kp1.publicKey)).not.toEqual(encodeBase64(kp2.publicKey));
    expect(encodeBase64(kp1.secretKey)).not.toEqual(encodeBase64(kp2.secretKey));
  });

  it('nonce is 24 bytes', () => {
    expect(box.nonceLength).toBe(24);
  });

  it('public key is 32 bytes', () => {
    const kp = box.keyPair();
    expect(kp.publicKey.length).toBe(32);
    expect(kp.secretKey.length).toBe(32);
  });
});
