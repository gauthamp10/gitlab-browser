/**
 * WebCrypto-based AES-GCM encryption for localStorage.
 *
 * Strategy:
 *   - A fresh AES-GCM-256 key is generated once per browser session and stored
 *     as an exported JWK in sessionStorage.
 *   - Sensitive data (PATs) is encrypted with this key before being written to
 *     localStorage; the encrypted blobs are useless without the session key.
 *   - When the browser is restarted (sessionStorage is cleared), the key is
 *     gone and encrypted data cannot be decrypted — getItem returns null so
 *     the user is prompted to re-authenticate. This is the desired behaviour.
 *   - Within a session, page refreshes work seamlessly.
 */

const SESSION_KEY_NAME = 'glab-session-key';

async function getOrCreateKey(): Promise<CryptoKey> {
  const stored = sessionStorage.getItem(SESSION_KEY_NAME);
  if (stored) {
    try {
      const jwk = JSON.parse(stored) as JsonWebKey;
      return await crypto.subtle.importKey(
        'jwk',
        jwk,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );
    } catch {
      // Corrupt key — fall through to generate a new one
      sessionStorage.removeItem(SESSION_KEY_NAME);
    }
  }

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  const exported = await crypto.subtle.exportKey('jwk', key);
  sessionStorage.setItem(SESSION_KEY_NAME, JSON.stringify(exported));
  return key;
}

interface EncryptedPayload {
  iv: string; // base64-encoded 12-byte nonce
  ct: string; // base64-encoded ciphertext
  v: 1;       // schema version
}

function toBase64(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

// Explicitly allocates an ArrayBuffer (never SharedArrayBuffer) so the return
// type is Uint8Array<ArrayBuffer> — assignable to BufferSource in TypeScript 5.6+.
function fromBase64(b64: string): Uint8Array<ArrayBuffer> {
  const decoded = atob(b64);
  const buffer = new ArrayBuffer(decoded.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < decoded.length; i++) bytes[i] = decoded.charCodeAt(i);
  return bytes;
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getOrCreateKey();
  const iv = new Uint8Array(12);
  crypto.getRandomValues(iv);
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  const payload: EncryptedPayload = {
    iv: toBase64(iv.buffer as ArrayBuffer),
    ct: toBase64(ciphertext),
    v: 1,
  };
  return JSON.stringify(payload);
}

export async function decrypt(encryptedJson: string): Promise<string> {
  const key = await getOrCreateKey();
  const parsed = JSON.parse(encryptedJson) as EncryptedPayload;
  if (parsed.v !== 1) throw new Error('Unsupported encryption schema version');
  const iv = fromBase64(parsed.iv);
  const ct = fromBase64(parsed.ct);
  const plaintext = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ct);
  return new TextDecoder().decode(plaintext);
}

/**
 * A StateStorage-compatible adapter that transparently encrypts values with
 * AES-GCM before writing to localStorage and decrypts on read.
 *
 * Pass to Zustand's persist middleware via:
 *   storage: createJSONStorage(() => encryptedLocalStorage)
 */
export const encryptedLocalStorage = {
  getItem: async (name: string): Promise<string | null> => {
    const raw = localStorage.getItem(name);
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as { v?: unknown };
      if (parsed.v === 1) {
        return await decrypt(raw);
      }
      // Legacy plaintext data — clear it and force re-auth
      localStorage.removeItem(name);
      return null;
    } catch {
      // Key mismatch (new session) or corrupt data — clear and force re-auth
      localStorage.removeItem(name);
      return null;
    }
  },

  setItem: async (name: string, value: string): Promise<void> => {
    const encrypted = await encrypt(value);
    localStorage.setItem(name, encrypted);
  },

  removeItem: (name: string): void => {
    localStorage.removeItem(name);
  },
};
