import { MasterKeyRecord, DerivedKeyPair, EncryptedPayload } from '../../types/encryption';
import { PBKDF2_ITERATIONS, SALT_LENGTH_BYTES } from './constants';
import { generateSaltHex, constantTimeEqual } from './random';
import { deriveKeyPair, deriveVerificationHash } from './keyDerivation';
import { encrypt, decrypt } from './aes';

export * from '../../types/encryption';
export {
  PBKDF2_ITERATIONS,
  KEY_LENGTH_BITS,
  PBKDF2_HASH_ALGORITHM,
  AES_ALGORITHM,
  SALT_LENGTH_BYTES,
  IV_LENGTH_BYTES,
  KEY_CONTEXT
} from './constants';
export { generateSaltHex, constantTimeEqual } from './random';

// ---------------------------------------------------------------------------
// Backup-friendly aliases
// These expose the raw PBKDF2 machinery under generic names so the Backup
// Service can derive keys from an independent backup password without going
// through the master-password-specific MasterKeyRecord flow.
// ---------------------------------------------------------------------------

/** Alias for generateSaltHex — generates a fresh hex-encoded random salt. */
export { generateSaltHex as generateSalt } from './random';

/** Alias for deriveKeyPair — derives { encryptionKey, macKey } from any password + salt. */
export { deriveKeyPair as deriveKeysFromPassword } from './keyDerivation';

/** Alias for encrypt — encrypts a plaintext string and returns an EncryptedPayload. */
export { encrypt as encryptString } from './aes';

/** Alias for decrypt — decrypts an EncryptedPayload and returns plaintext. */
export { decrypt as decryptString } from './aes';

/**
 * Creates a new master password record and derives the initial key pair.
 * Used during user registration or setup.
 *
 * @param password - The master password chosen by the user.
 * @returns An object containing the MasterKeyRecord to save in the database,
 *          and the derived key pair (encryption + MAC key) for immediate use.
 */
export async function createMasterPassword(password: string): Promise<{
  record: MasterKeyRecord;
  keys: DerivedKeyPair;
}> {
  const salt = await generateSaltHex();
  const iterations = PBKDF2_ITERATIONS;

  const keys = await deriveKeyPair(password, salt);
  const verificationHash = await deriveVerificationHash(password, salt);

  const record: MasterKeyRecord = {
    salt,
    verificationHash,
    iterations,
  };

  return { record, keys };
}

/**
 * Verifies a master password against the saved DB record.
 * If authentication succeeds, it derives the key pair (encryption + MAC key).
 *
 * @param password - The password input.
 * @param record - The MasterKeyRecord stored in the database.
 * @returns The derived keys if valid, or null if verification fails.
 */
export async function verifyMasterPassword(
  password: string,
  record: MasterKeyRecord
): Promise<DerivedKeyPair | null> {
  // 1. Derive verification hash from password & record's salt
  const verificationHash = await deriveVerificationHash(password, record.salt);

  // 2. Constant-time comparison of verification hash to prevent timing attacks
  if (!constantTimeEqual(verificationHash, record.verificationHash)) {
    return null;
  }

  // 3. Derive and return the key pair
  const keys = await deriveKeyPair(password, record.salt);
  return keys;
}

/**
 * Helper factory that creates a FieldCipher instance bound to a specific key pair.
 * Simplifies performing encryption and decryption operations over vault item fields.
 *
 * @param keys - The derived key pair for the vault.
 * @returns An object containing bound `encrypt` and `decrypt` functions.
 */
export function createFieldCipher(keys: DerivedKeyPair) {
  return {
    /**
     * Encrypts plaintext string using the bound keys.
     */
    async encrypt(plaintext: string): Promise<EncryptedPayload> {
      return encrypt(plaintext, keys.encryptionKey, keys.macKey);
    },

    /**
     * Decrypts an EncryptedPayload using the bound keys.
     */
    async decrypt(payload: EncryptedPayload): Promise<string> {
      return decrypt(payload, keys.encryptionKey, keys.macKey);
    },
  };
}
