/**
 * Core encryption types shared across the app.
 * These describe the shape of data ONCE it has been through the
 * encryption service — nothing here ever holds plaintext secrets.
 */

/** Result of encrypting a single string field (password, key, notes, backup, etc). */
export interface EncryptedPayload {
  /** Base64 AES-256-CBC ciphertext. */
  ciphertext: string;
  /** Hex-encoded initialization vector, unique per encryption call. */
  iv: string;
  /** Hex-encoded HMAC-SHA256 over (iv + ciphertext), for tamper detection. */
  hmac: string;
}

/** The two derived keys needed to encrypt/decrypt + authenticate a payload. */
export interface DerivedKeyPair {
  /** Hex-encoded 256-bit AES key. */
  encryptionKey: string;
  /** Hex-encoded 256-bit HMAC key. */
  macKey: string;
}

/**
 * What gets persisted (in SecureStore) to verify a master password later
 * WITHOUT ever storing the password or the derived keys themselves.
 */
export interface MasterKeyRecord {
  /** Hex-encoded random salt, unique per vault. */
  salt: string;
  /** PBKDF2-derived verification hash — proves password correctness only. */
  verificationHash: string;
  /** PBKDF2 iteration count used, stored so it can be upgraded later without breaking old vaults. */
  iterations: number;
}

/** Thrown when a payload's HMAC does not match — indicates tampering or wrong key. */
export class IntegrityError extends Error {
  constructor(message = 'Data integrity check failed: ciphertext may be corrupted or tampered with.') {
    super(message);
    this.name = 'IntegrityError';
  }
}

/** Thrown for any other encryption/decryption failure (bad input, native module error, etc). */
export class EncryptionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EncryptionError';
  }
}
