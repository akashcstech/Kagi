import { secureStorage } from './secureStorage';
import { STORE_KEYS, DEFAULT_BIOMETRIC_PROMPT } from './constants';
import { MasterKeyRecord, DerivedKeyPair } from '@/types/encryption';
import { SecureStoreError, BiometricUnavailableError } from '@/types/secureStore';

/**
 * ============================================================================
 * WHAT LIVES HERE (and nowhere else)
 * ============================================================================
 * - MASTER_RECORD: salt + verification hash + iteration count. Enough to
 *   check a master password is correct. NOT enough to decrypt anything.
 * - BIOMETRIC_ENABLED: user preference toggle.
 * - BIOMETRIC_PROTECTED_KEYS: the actual encryption/MAC keys, but gated by
 *   the OS biometric prompt (requireAuthentication). Only written if the
 *   user explicitly turns on biometric unlock.
 *
 * Vault data (folders/entries) is NEVER stored here — it lives encrypted in
 * SQLite (Feature 4). This module only ever holds authentication metadata.
 * ============================================================================
 */

// ---- Master password record ------------------------------------------------

export async function saveMasterKeyRecord(record: MasterKeyRecord): Promise<void> {
  await secureStorage.setRaw(STORE_KEYS.MASTER_RECORD, JSON.stringify(record));
}

export async function loadMasterKeyRecord(): Promise<MasterKeyRecord | null> {
  const raw = await secureStorage.getRaw(STORE_KEYS.MASTER_RECORD);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as MasterKeyRecord;
  } catch (err) {
    throw new SecureStoreError('Stored master key record is corrupted and could not be parsed.');
  }
}

/** Whether a vault has already been set up on this device (drives onboarding vs. login). */
export async function hasMasterKeyRecord(): Promise<boolean> {
  return (await loadMasterKeyRecord()) !== null;
}

/** Deletes ALL auth metadata — used when the user resets/deletes the vault entirely. */
export async function clearMasterKeyRecord(): Promise<void> {
  await secureStorage.deleteRaw(STORE_KEYS.MASTER_RECORD);
}

// ---- Biometric preference ---------------------------------------------------

export async function isBiometricEnabled(): Promise<boolean> {
  const raw = await secureStorage.getRaw(STORE_KEYS.BIOMETRIC_ENABLED);
  return raw === '1';
}

async function setBiometricEnabledFlag(enabled: boolean): Promise<void> {
  await secureStorage.setRaw(STORE_KEYS.BIOMETRIC_ENABLED, enabled ? '1' : '0');
}

// ---- Biometric-protected key material ---------------------------------------

/**
 * Call when the user turns ON biometric unlock (after a successful master
 * password login). Stores the session's derived keys behind the OS
 * biometric gate so future unlocks can skip the master password screen.
 */
export async function enableBiometricUnlock(keys: DerivedKeyPair): Promise<void> {
  await secureStorage.setRaw(STORE_KEYS.BIOMETRIC_PROTECTED_KEYS, JSON.stringify(keys), true);
  await setBiometricEnabledFlag(true);
}

/**
 * Call when the user turns OFF biometric unlock, or when master password is
 * changed (the old biometric-protected keys would no longer be valid).
 */
export async function disableBiometricUnlock(): Promise<void> {
  await secureStorage.deleteRaw(STORE_KEYS.BIOMETRIC_PROTECTED_KEYS);
  await setBiometricEnabledFlag(false);
}

/**
 * Attempts to read the biometric-protected keys, which triggers the native
 * Face ID / fingerprint prompt. Throws BiometricUnavailableError if the user
 * cancels, fails, or biometrics aren't available — callers should catch
 * that specific error and fall back to the master password screen rather
 * than showing a generic error.
 */
export async function loadBiometricProtectedKeys(
  promptMessage: string = DEFAULT_BIOMETRIC_PROMPT,
): Promise<DerivedKeyPair | null> {
  const enabled = await isBiometricEnabled();
  if (!enabled) return null;

  const raw = await secureStorage.getRaw(STORE_KEYS.BIOMETRIC_PROTECTED_KEYS, {
    requireAuthentication: true,
    authenticationPrompt: promptMessage,
  });

  if (!raw) return null;

  try {
    return JSON.parse(raw) as DerivedKeyPair;
  } catch (err) {
    throw new SecureStoreError('Stored biometric key material is corrupted and could not be parsed.');
  }
}

// ---- Full wipe (used by "delete vault" / reset flows) -----------------------

export async function clearAllCredentials(): Promise<void> {
  await Promise.all([
    secureStorage.deleteRaw(STORE_KEYS.MASTER_RECORD),
    secureStorage.deleteRaw(STORE_KEYS.BIOMETRIC_PROTECTED_KEYS),
    secureStorage.deleteRaw(STORE_KEYS.BIOMETRIC_ENABLED),
  ]);
}

export { BiometricUnavailableError };
