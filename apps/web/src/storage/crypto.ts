/**
 * PIN-derived key helpers for field encryption via Web Crypto.
 * Sensitive Mama Passport fields are encrypted at rest in IndexedDB.
 */

const PBKDF2_ITERATIONS = 150_000;
const SALT_BYTES = 16;
const IV_BYTES = 12;

export interface CryptoMaterial {
  saltB64: string;
  key: CryptoKey;
}

/** Copies bytes into a fresh ArrayBuffer (avoids SharedArrayBuffer typing friction). */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

/** Converts ArrayBuffer / Uint8Array to base64. */
export function bytesToB64(bytes: ArrayBuffer | Uint8Array): string {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of view) s += String.fromCharCode(b);
  return btoa(s);
}

/** Converts base64 to Uint8Array. */
export function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/**
 * Derives an AES-GCM key from a PIN and optional existing salt.
 * Creates a new random salt when none is provided (first unlock).
 */
export async function deriveKeyFromPin(pin: string, existingSaltB64?: string): Promise<CryptoMaterial> {
  const saltBytes = existingSaltB64
    ? b64ToBytes(existingSaltB64)
    : crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const salt = toArrayBuffer(saltBytes);
  const baseKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, [
    'deriveKey',
  ]);
  const key = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
  return { saltB64: bytesToB64(salt), key };
}

/** Encrypts a UTF-8 string; returns iv + ciphertext as base64. */
export async function encryptString(key: CryptoKey, plain: string): Promise<string> {
  const ivBytes = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const iv = toArrayBuffer(ivBytes);
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plain),
  );
  const packed = new Uint8Array(IV_BYTES + cipher.byteLength);
  packed.set(new Uint8Array(iv), 0);
  packed.set(new Uint8Array(cipher), IV_BYTES);
  return bytesToB64(packed);
}

/** Decrypts a payload produced by encryptString. */
export async function decryptString(key: CryptoKey, payloadB64: string): Promise<string> {
  const packed = b64ToBytes(payloadB64);
  const iv = toArrayBuffer(packed.subarray(0, IV_BYTES));
  const data = toArrayBuffer(packed.subarray(IV_BYTES));
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, data);
  return new TextDecoder().decode(plain);
}
