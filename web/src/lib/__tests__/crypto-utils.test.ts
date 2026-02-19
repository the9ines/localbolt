import { describe, it, expect } from 'vitest';
import {
  generateSecurePeerCode,
  generateLongPeerCode,
  isValidPeerCode,
  normalizePeerCode,
  sha256,
  bufferToHex,
} from '../crypto-utils';

const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

describe('generateSecurePeerCode', () => {
  it('returns a 6-character string', () => {
    const code = generateSecurePeerCode();
    expect(code).toHaveLength(6);
  });

  it('uses only valid alphabet characters', () => {
    for (let i = 0; i < 20; i++) {
      const code = generateSecurePeerCode();
      for (const char of code) {
        expect(ALPHABET).toContain(char);
      }
    }
  });

  it('generates unique codes', () => {
    const codes = new Set(Array.from({ length: 50 }, () => generateSecurePeerCode()));
    expect(codes.size).toBeGreaterThan(40);
  });
});

describe('generateLongPeerCode', () => {
  it('returns XXXX-XXXX format', () => {
    const code = generateLongPeerCode();
    expect(code).toMatch(/^[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });

  it('has 9 characters including dash', () => {
    expect(generateLongPeerCode()).toHaveLength(9);
  });
});

describe('isValidPeerCode', () => {
  it('accepts valid 6-char codes', () => {
    expect(isValidPeerCode('ABCDEF')).toBe(true);
  });

  it('accepts valid 8-char codes with dash', () => {
    expect(isValidPeerCode('ABCD-EFGH')).toBe(true);
  });

  it('accepts valid 8-char codes without dash', () => {
    expect(isValidPeerCode('ABCDEFGH')).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(isValidPeerCode('abcdef')).toBe(true);
  });

  it('rejects wrong length', () => {
    expect(isValidPeerCode('ABC')).toBe(false);
    expect(isValidPeerCode('ABCDEFGHIJ')).toBe(false);
  });

  it('rejects ambiguous characters (0, O, 1, I, L)', () => {
    expect(isValidPeerCode('ABCDE0')).toBe(false);
    expect(isValidPeerCode('ABCDE1')).toBe(false);
    expect(isValidPeerCode('ABCDEI')).toBe(false);
    expect(isValidPeerCode('ABCDEL')).toBe(false);
    expect(isValidPeerCode('ABCDEO')).toBe(false);
  });

  it('accepts generated codes', () => {
    expect(isValidPeerCode(generateSecurePeerCode())).toBe(true);
    expect(isValidPeerCode(generateLongPeerCode())).toBe(true);
  });
});

describe('normalizePeerCode', () => {
  it('removes dashes', () => {
    expect(normalizePeerCode('ABCD-EFGH')).toBe('ABCDEFGH');
  });

  it('uppercases', () => {
    expect(normalizePeerCode('abcdef')).toBe('ABCDEF');
  });

  it('handles already normalized codes', () => {
    expect(normalizePeerCode('ABCDEF')).toBe('ABCDEF');
  });
});

describe('bufferToHex', () => {
  it('converts empty buffer', () => {
    expect(bufferToHex(new Uint8Array([]).buffer)).toBe('');
  });

  it('converts known bytes', () => {
    expect(bufferToHex(new Uint8Array([0, 1, 255]).buffer)).toBe('0001ff');
  });

  it('pads single-digit hex values', () => {
    expect(bufferToHex(new Uint8Array([0x0a]).buffer)).toBe('0a');
  });
});

describe('sha256', () => {
  it('produces a 32-byte hash', async () => {
    const data = new TextEncoder().encode('hello');
    const hash = await sha256(data);
    expect(new Uint8Array(hash)).toHaveLength(32);
  });

  it('produces consistent output', async () => {
    const data = new TextEncoder().encode('test');
    const hash1 = bufferToHex(await sha256(data));
    const hash2 = bufferToHex(await sha256(data));
    expect(hash1).toBe(hash2);
  });

  it('produces known hash for empty input', async () => {
    const hash = bufferToHex(await sha256(new Uint8Array([])));
    expect(hash).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  });
});
