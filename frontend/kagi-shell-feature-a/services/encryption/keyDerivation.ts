import Aes from 'react-native-aes-crypto';
import { PBKDF2_ITERATIONS, KEY_LENGTH_BITS, PBKDF2_HASH_ALGORITHM, KEY_CONTEXT } from './constants';
import { EncryptionError, DerivedKeyPair } from '@/types/encryption';

/**
 * Raw PBKDF2 derivation. `context` is mixed into the salt to achieve domain
 * separation — see constants.ts for why this matters.
 */
async function pbkdf2(password: string, salt: string, context: string): Promise<string> {
  try {
    const saltedContext = `${salt}:${context}`;
    const derived = await Aes.pbkdf2(password, saltedContext, PBKDF2_ITERATIONS, KEY_LENGTH_BITS);
    return derived;
  } catch (err) {
    throw new EncryptionError(`PBKDF2 derivation failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Derives the AES encryption key used to encrypt/decrypt vault fields.
 * Never persisted — recomputed from the master password on every unlock.
 */
export async function deriveEncryptionKey(password: string, salt: string): Promise<string> {
  return pbkdf2(password, salt, KEY_CONTEXT.ENCRYPTION);
}

/**
 * Derives the HMAC key used to authenticate ciphertext (encrypt-then-MAC).
 * Never persisted — recomputed from the master password on every unlock.
 */
export async function deriveMacKey(password: string, salt: string): Promise<string> {
  return pbkdf2(password, salt, KEY_CONTEXT.MAC);
}

/** Convenience: derive both keys needed for field encryption in one call. */
export async function deriveKeyPair(password: string, salt: string): Promise<DerivedKeyPair> {
  const [encryptionKey, macKey] = await Promise.all([
    deriveEncryptionKey(password, salt),
    deriveMacKey(password, salt),
  ]);
  return { encryptionKey, macKey };
}

/**
 * Derives a value used ONLY to verify the master password at login.
 * This is cryptographically independent of the encryption/MAC keys — an
 * attacker who steals the stored verification hash cannot decrypt the vault.
 */
export async function deriveVerificationHash(password: string, salt: string): Promise<string> {
  return pbkdf2(password, salt, KEY_CONTEXT.VERIFICATION);
}
