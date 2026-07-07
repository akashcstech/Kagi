import {
  createMasterPassword,
  verifyMasterPassword,
  createFieldCipher,
} from '@/services/encryption';
import {
  saveMasterKeyRecord,
  loadMasterKeyRecord,
  hasMasterKeyRecord,
  isBiometricEnabled,
  enableBiometricUnlock,
  disableBiometricUnlock,
  loadBiometricProtectedKeys,
  clearAllCredentials,
  BiometricUnavailableError,
} from '@/services/secureStore';
import { sessionManager } from './session';
import { masterPasswordFieldSchema } from './passwordPolicy';
import { DerivedKeyPair, MasterKeyRecord } from '@/types/encryption';
import {
  VaultAlreadyInitializedError,
  VaultNotInitializedError,
  WrongPasswordError,
  SessionLockedError,
} from '@/types/auth';

export async function isVaultInitialized(): Promise<boolean> {
  return hasMasterKeyRecord();
}

export async function setupMasterPassword(password: string): Promise<void> {
  if (await hasMasterKeyRecord()) {
    throw new VaultAlreadyInitializedError();
  }

  masterPasswordFieldSchema.parse(password);

  const { record, keys } = await createMasterPassword(password);
  await saveMasterKeyRecord(record);
  sessionManager.start(keys);
}

export async function login(password: string): Promise<void> {
  const record = await loadMasterKeyRecord();
  if (!record) {
    throw new VaultNotInitializedError();
  }

  const keys = await verifyMasterPassword(password, record);
  if (!keys) {
    throw new WrongPasswordError();
  }

  sessionManager.start(keys);
}

export async function loginWithBiometrics(promptMessage?: string): Promise<boolean> {
  try {
    const keys = await loadBiometricProtectedKeys(promptMessage);
    if (!keys) return false;

    sessionManager.start(keys);
    return true;
  } catch (err) {
    if (err instanceof BiometricUnavailableError) {
      return false;
    }
    throw err;
  }
}

export function lock(): void {
  sessionManager.end();
}

export function logout(): void {
  sessionManager.end();
}

export function isUnlocked(): boolean {
  return sessionManager.isUnlocked();
}

export function getSessionCipher() {
  const keys = sessionManager.getKeys();
  if (!keys) {
    throw new SessionLockedError();
  }
  return createFieldCipher(keys);
}

export async function isBiometricUnlockEnabled(): Promise<boolean> {
  return isBiometricEnabled();
}

export async function enableBiometrics(): Promise<void> {
  const keys = sessionManager.getKeys();
  if (!keys) {
    throw new SessionLockedError('You must be logged in with your master password to enable biometric unlock.');
  }
  await enableBiometricUnlock(keys);
}

export async function disableBiometrics(): Promise<void> {
  await disableBiometricUnlock();
}

export interface ChangeMasterPasswordResult {
  oldKeys: DerivedKeyPair;
  newKeys: DerivedKeyPair;
}

/**
 * Phase 1: Verify the current password and derive new keys/record.
 * Does NOT persist anything — safe to call before a re-encryption pass.
 */
export async function prepareMasterPasswordChange(
  currentPassword: string,
  newPassword: string,
): Promise<ChangeMasterPasswordResult & { newRecord: MasterKeyRecord }> {
  const record = await loadMasterKeyRecord();
  if (!record) {
    throw new VaultNotInitializedError();
  }

  const oldKeys = await verifyMasterPassword(currentPassword, record);
  if (!oldKeys) {
    throw new WrongPasswordError('Current password is incorrect.');
  }

  masterPasswordFieldSchema.parse(newPassword);

  const { record: newRecord, keys: newKeys } = await createMasterPassword(newPassword);

  return { oldKeys, newKeys, newRecord };
}

/**
 * Phase 2: Persist the new master record and start a new session.
 * Only called after all entries have been successfully re-encrypted
 * under newKeys, so a failure before this point leaves the vault intact.
 */
export async function commitMasterPasswordChange(newRecord: MasterKeyRecord, newKeys: DerivedKeyPair): Promise<void> {
  await disableBiometricUnlock();
  await saveMasterKeyRecord(newRecord);
  sessionManager.start(newKeys);
}

/**
 * Convenience wrapper for callers that don't need the two-phase split
 * (e.g. tests). Note: this does NOT re-encrypt entries — use
 * changeMasterPasswordSafely() in the Settings Service for that.
 */
export async function changeMasterPassword(
  currentPassword: string,
  newPassword: string,
): Promise<ChangeMasterPasswordResult> {
  const { oldKeys, newKeys, newRecord } = await prepareMasterPasswordChange(currentPassword, newPassword);
  await commitMasterPasswordChange(newRecord, newKeys);
  return { oldKeys, newKeys };
}

export async function resetVaultCredentials(): Promise<void> {
  await clearAllCredentials();
  sessionManager.end();
}
