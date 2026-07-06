import * as crypto from 'crypto';
import { EncryptedPayload, EncryptionError, IntegrityError } from '../../types/encryption';
import { AES_ALGORITHM, PBKDF2_HASH_ALGORITHM } from './constants';
import { generateIVHex, constantTimeEqual } from './random';

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
    const encKey = Buffer.from(encryptionKeyHex, 'hex');
    const macKey = Buffer.from(macKeyHex, 'hex');

    // Generate a random 16-byte initialization vector (IV) for AES-256-CBC
    const ivHex = await generateIVHex();
    const iv = Buffer.from(ivHex, 'hex');

    // Initialize the cipher
    const cipher = crypto.createCipheriv(AES_ALGORITHM, encKey, iv);

    // Perform encryption - Output as Base64
    let ciphertext = cipher.update(plaintext, 'utf8', 'base64');
    ciphertext += cipher.final('base64');

    // Compute HMAC-SHA256 signature over (IV + Ciphertext)
    // iv is hex-encoded, ciphertext is base64-encoded
    const hmac = crypto.createHmac(PBKDF2_HASH_ALGORITHM, macKey);
    hmac.update(ivHex, 'hex');
    hmac.update(ciphertext, 'base64');
    const hmacHex = hmac.digest('hex');

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
export function decrypt(
  payload: EncryptedPayload,
  encryptionKeyHex: string,
  macKeyHex: string
): string {
  const encKey = Buffer.from(encryptionKeyHex, 'hex');
  const macKey = Buffer.from(macKeyHex, 'hex');

  // Verify signature first (constant-time compare to mitigate timing attacks)
  const hmac = crypto.createHmac(PBKDF2_HASH_ALGORITHM, macKey);
  hmac.update(payload.iv, 'hex');
  hmac.update(payload.ciphertext, 'base64');
  const computedHmacHex = hmac.digest('hex');

  if (!constantTimeEqual(computedHmacHex, payload.hmac)) {
    throw new IntegrityError();
  }

  try {
    const iv = Buffer.from(payload.iv, 'hex');

    // Initialize decipher
    const decipher = crypto.createDecipheriv(AES_ALGORITHM, encKey, iv);

    // Perform decryption - Input is Base64, Output is UTF-8
    let decrypted = decipher.update(payload.ciphertext, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    throw new EncryptionError('Decryption failed');
  }
}
