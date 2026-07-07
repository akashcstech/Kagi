import * as Crypto from 'expo-crypto';
import { SALT_LENGTH_BYTES, IV_LENGTH_BYTES } from './constants';
import { EncryptionError } from '@/types/encryption';

/** Converts a Uint8Array into a lowercase hex string. */
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Generates cryptographically secure random bytes and returns them as hex. */
async function randomHex(byteLength: number): Promise<string> {
  try {
    const bytes = await Crypto.getRandomBytesAsync(byteLength);
    return bytesToHex(bytes);
  } catch (err) {
    throw new EncryptionError(
      `Failed to generate secure random bytes: ${err instanceof Error ? err.message : String(err)}`,
    );
  }
}

/** New random salt for PBKDF2 key derivation. One per vault, generated once at setup. */
export async function generateSaltHex(): Promise<string> {
  return randomHex(SALT_LENGTH_BYTES);
}

/** New random IV. MUST be unique per encryption call — never reused with the same key. */
export async function generateIVHex(): Promise<string> {
  return randomHex(IV_LENGTH_BYTES);
}

/**
 * Constant-time string comparison to prevent timing attacks when checking
 * HMACs or verification hashes. Always compares the full length of both
 * strings regardless of where the first difference occurs.
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a dummy comparison of equal-length garbage so the function's
    // timing doesn't leak the fact that lengths differ.
    let dummy = 0;
    for (let i = 0; i < a.length; i += 1) {
      dummy |= a.charCodeAt(i) ^ a.charCodeAt(i);
    }
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
