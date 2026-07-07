import Aes from 'react-native-aes-crypto';
import { EncryptedPayload, EncryptionError, IntegrityError } from '../../types/encryption';
import { constantTimeEqual } from './random';

/**
 * Encrypts a plaintext string using AES-256-CBC, and signs it using HMAC-SHA256
 * in an Encrypt-then-MAC (EtM) scheme to protect against padding oracle attacks.
 *
 * @param plaintext - The raw text to encrypt.
 * @param encryptionKeyHex - 256-bit encryption key in hex format.
 * @param macKeyHex - 256-bit MAC signature key in hex format.
 * @returns The EncryptedPayload containing ciphertext, iv, and mac.
 * @throws EncryptionError if encryption fails.
 */
export async function encrypt(
  plaintext: string,
  encryptionKeyHex: string,
  macKeyHex: string
): Promise<EncryptedPayload> {
  try {
    // Generate a random 16-byte initialization vector (IV) for AES-256-CBC
    // Aes.randomKey takes length in bytes
    const ivHex = await Aes.randomKey(16);

    // Perform encryption - returns base64 string
    const ciphertext = await Aes.encrypt(plaintext, encryptionKeyHex, ivHex, 'aes-256-cbc');

    // Compute HMAC-SHA256 signature over (IV + Ciphertext)
    // iv is hex-encoded, ciphertext is base64-encoded
    const hmacHex = await Aes.hmac256(ivHex + ciphertext, macKeyHex);

    return {
      ciphertext,
      iv: ivHex,
      hmac: hmacHex,
    };
  } catch (error) {
    throw new EncryptionError('Encryption failed');
  }
}

/**
 * Verifies the HMAC-SHA256 signature of an EncryptedPayload and, if valid,
 * decrypts the AES-256-CBC ciphertext.
 *
 * @param payload - The EncryptedPayload to decrypt.
 * @param encryptionKeyHex - 256-bit encryption key in hex format.
 * @param macKeyHex - 256-bit MAC signature key in hex format.
 * @returns The decrypted plaintext string.
 * @throws IntegrityError if the HMAC check fails.
 * @throws EncryptionError if the decryption process fails (e.g. padding corruption).
 */
export async function decrypt(
  payload: EncryptedPayload,
  encryptionKeyHex: string,
  macKeyHex: string
): Promise<string> {
  // Verify signature first (constant-time compare to mitigate timing attacks)
  const computedHmacHex = await Aes.hmac256(payload.iv + payload.ciphertext, macKeyHex);

  if (!constantTimeEqual(computedHmacHex, payload.hmac)) {
    throw new IntegrityError();
  }

  try {
    // Perform decryption - returns UTF-8 string
    const decrypted = await Aes.decrypt(payload.ciphertext, encryptionKeyHex, payload.iv, 'aes-256-cbc');
    return decrypted;
  } catch (error) {
    throw new EncryptionError('Decryption failed');
  }
}

