import { describe, it, expect, beforeEach } from 'vitest';
import { encrypt, decrypt, encryptedLocalStorage } from '../../utils/crypto';

// jsdom provides crypto.subtle via Node's WebCrypto implementation.

// ─────────────────────────────────────────────────────────────────────────────
// encrypt / decrypt round-trip
// ─────────────────────────────────────────────────────────────────────────────
describe('encrypt', () => {
  it('returns a JSON string with the expected schema', async () => {
    const ciphertext = await encrypt('hello');
    const parsed = JSON.parse(ciphertext);
    expect(parsed.v).toBe(1);
    expect(typeof parsed.iv).toBe('string');
    expect(typeof parsed.ct).toBe('string');
  });

  it('produces different ciphertext on every call (random IV)', async () => {
    const a = await encrypt('same plaintext');
    const b = await encrypt('same plaintext');
    expect(a).not.toBe(b);
    // iv fields should differ
    expect(JSON.parse(a).iv).not.toBe(JSON.parse(b).iv);
  });

  it('encrypts empty string without error', async () => {
    const result = await encrypt('');
    const parsed = JSON.parse(result);
    expect(parsed.v).toBe(1);
  });

  it('handles long strings (PAT-like values)', async () => {
    const pat = 'glpat-' + 'a'.repeat(64);
    const ciphertext = await encrypt(pat);
    const decrypted = await decrypt(ciphertext);
    expect(decrypted).toBe(pat);
  });
});

describe('decrypt', () => {
  it('recovers the original plaintext', async () => {
    const plaintext = 'glpat-test-token-12345';
    const ciphertext = await encrypt(plaintext);
    const result = await decrypt(ciphertext);
    expect(result).toBe(plaintext);
  });

  it('preserves unicode characters', async () => {
    const text = 'héllo wörld 🔑';
    expect(await decrypt(await encrypt(text))).toBe(text);
  });

  it('throws on unsupported schema version', async () => {
    const bad = JSON.stringify({ v: 99, iv: 'abc', ct: 'def' });
    await expect(decrypt(bad)).rejects.toThrow('Unsupported encryption schema version');
  });

  it('throws when ciphertext is tampered with', async () => {
    const ciphertext = await encrypt('secret');
    const payload = JSON.parse(ciphertext);
    // Flip the first character of the ciphertext base64
    const tampered = payload.ct.replace(/^./, payload.ct[0] === 'A' ? 'B' : 'A');
    await expect(
      decrypt(JSON.stringify({ ...payload, ct: tampered }))
    ).rejects.toThrow();
  });

  it('throws on corrupt JSON', async () => {
    await expect(decrypt('not json')).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Cross-session isolation: new session key cannot decrypt old data
// ─────────────────────────────────────────────────────────────────────────────
describe('cross-session isolation', () => {
  it('cannot decrypt data encrypted with a different session key', async () => {
    // Encrypt with current session key
    const ciphertext = await encrypt('my-token');

    // Simulate browser restart: clear sessionStorage (destroys the key)
    sessionStorage.clear();

    // Attempt to decrypt — a new key is generated, decryption must fail
    await expect(decrypt(ciphertext)).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// encryptedLocalStorage adapter
// ─────────────────────────────────────────────────────────────────────────────
describe('encryptedLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  it('setItem stores encrypted (non-plaintext) data', async () => {
    await encryptedLocalStorage.setItem('test-key', '{"token":"glpat-secret"}');
    const raw = localStorage.getItem('test-key');
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('glpat-secret');
    // Must look like our encrypted payload
    const parsed = JSON.parse(raw!);
    expect(parsed.v).toBe(1);
  });

  it('getItem returns null for missing key', async () => {
    expect(await encryptedLocalStorage.getItem('missing')).toBeNull();
  });

  it('getItem round-trips the value correctly', async () => {
    const value = '{"token":"glpat-abc123","host":"https://gitlab.com"}';
    await encryptedLocalStorage.setItem('auth', value);
    const result = await encryptedLocalStorage.getItem('auth');
    expect(result).toBe(value);
  });

  it('getItem returns null and clears storage for legacy plaintext data', async () => {
    // Write plaintext JSON (simulating old unencrypted store)
    localStorage.setItem('auth', '{"token":"plaintext-pat"}');
    const result = await encryptedLocalStorage.getItem('auth');
    expect(result).toBeNull();
    // Stale plaintext should have been removed
    expect(localStorage.getItem('auth')).toBeNull();
  });

  it('getItem returns null and clears when session key is gone (new session)', async () => {
    await encryptedLocalStorage.setItem('auth', '{"token":"secret"}');
    // Simulate browser restart by clearing the session key
    sessionStorage.clear();
    const result = await encryptedLocalStorage.getItem('auth');
    expect(result).toBeNull();
    // Undecryptable blob should have been cleaned up
    expect(localStorage.getItem('auth')).toBeNull();
  });

  it('removeItem deletes the key from localStorage', async () => {
    await encryptedLocalStorage.setItem('x', 'value');
    encryptedLocalStorage.removeItem('x');
    expect(localStorage.getItem('x')).toBeNull();
  });
});
