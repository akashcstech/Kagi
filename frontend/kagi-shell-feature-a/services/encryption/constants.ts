/**
 * Single source of truth for every cryptographic parameter used in the app.
 * Changing these affects ALL new encryptions — never change SALT/IV lengths
 * or ALGORITHM after release without a data-migration plan, or existing
 * vaults become unreadable.
 */

/** PBKDF2 rounds. 100k is OWASP's current minimum recommendation for PBKDF2-SHA256. */
export const PBKDF2_ITERATIONS = 100_000;

/** Derived key length in bits (AES-256 + HMAC-SHA256 both need 256-bit keys). */
export const KEY_LENGTH_BITS = 256;

/** PBKDF2 pseudorandom function. */
export const PBKDF2_HASH_ALGORITHM = 'sha256';

/** AES mode. CBC is paired with a separate HMAC below (encrypt-then-MAC) since CBC alone is not authenticated. */
export const AES_ALGORITHM = 'aes-256-cbc';

/** Salt length in bytes (128 bits — plenty to prevent rainbow-table / multi-target attacks). */
export const SALT_LENGTH_BYTES = 16;

/** AES-CBC block size / IV length in bytes. Must be 16 for AES. */
export const IV_LENGTH_BYTES = 16;

/**
 * Domain-separation labels. We derive the *encryption key*, the *MAC key*,
 * and the *login verification hash* from the SAME master password but with
 * different context labels mixed into the PBKDF2 salt. This guarantees the
 * three outputs are cryptographically independent: knowing the verification
 * hash (which is what gets stored on disk) gives no information about the
 * actual encryption or MAC keys.
 */
export const KEY_CONTEXT = {
  ENCRYPTION: 'kagi:v1:encryption-key',
  MAC: 'kagi:v1:mac-key',
  VERIFICATION: 'kagi:v1:verification-hash',
} as const;
