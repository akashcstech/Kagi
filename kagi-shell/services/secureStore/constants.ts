/**
 * Single source of truth for every SecureStore key + option used to persist
 * authentication metadata. NOTHING vault-related (folders/entries) is ever
 * stored here — only what's needed to verify the master password and,
 * optionally, unlock biometrically.
 */

/** Namespaces all Kagi keys in the OS keychain/keystore, separate from other apps. */
export const KEYCHAIN_SERVICE = 'kagi.vault.auth';

export const STORE_KEYS = {
  /** JSON-stringified MasterKeyRecord: { salt, verificationHash, iterations }. */
  MASTER_RECORD: 'kagi_master_record',
  /** '1' | '0' — whether the user has opted into biometric unlock. */
  BIOMETRIC_ENABLED: 'kagi_biometric_enabled',
  /**
   * JSON-stringified DerivedKeyPair, written ONLY if biometric unlock is
   * enabled. Protected with requireAuthentication so the OS itself prompts
   * Face ID / fingerprint before releasing it — Kagi's own code never
   * decides "was the fingerprint good enough", the OS keystore does.
   */
  BIOMETRIC_PROTECTED_KEYS: 'kagi_biometric_keys',
} as const;

/** Default prompt shown by the OS when reading the biometric-protected key. */
export const DEFAULT_BIOMETRIC_PROMPT = 'Unlock Kagi';
