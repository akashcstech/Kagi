import { deleteDatabaseFile } from '@/database';
import {
  isBiometricUnlockEnabled,
  prepareMasterPasswordChange,
  commitMasterPasswordChange,
  resetVaultCredentials,
} from '@/services/auth';
import { reencryptAllEntries } from '@/services/entries';
import { getAutoLockDuration } from '@/services/autoLock';
import { getThemePreference } from './themeService';
import { SettingsSnapshot } from '@/types/settings';

export const APP_NAME = 'Kagi';
export const APP_VERSION = '1.0.0';

/**
 * Fetches all settings in parallel for the Settings screen initial load.
 */
export async function getSettingsSnapshot(): Promise<SettingsSnapshot> {
  const [theme, autoLockDuration, biometricEnabled] = await Promise.all([
    getThemePreference(),
    getAutoLockDuration(),
    isBiometricUnlockEnabled(),
  ]);

  return { theme, autoLockDuration, biometricEnabled };
}

// ---------------------------------------------------------------------------
// Re-exports — the Settings screen imports everything from one place
// ---------------------------------------------------------------------------

export { getThemePreference, setThemePreference } from './themeService';
export { getAutoLockDuration, setAutoLockDuration } from '@/services/autoLock';
export { isBiometricUnlockEnabled, enableBiometrics, disableBiometrics } from '@/services/auth';

/**
 * Safe two-phase password change:
 *   1. prepareMasterPasswordChange — verify + derive (no persistence)
 *   2. reencryptAllEntries         — re-encrypt vault data under new keys
 *   3. commitMasterPasswordChange  — persist new record + start session
 *
 * If step 2 fails, the old master record is still in place and the vault
 * remains fully accessible with the old password.
 */
export async function changeMasterPasswordSafely(currentPassword: string, newPassword: string): Promise<void> {
  const { oldKeys, newKeys, newRecord } = await prepareMasterPasswordChange(currentPassword, newPassword);
  await reencryptAllEntries(oldKeys, newKeys);
  await commitMasterPasswordChange(newRecord, newKeys);
}

/**
 * Permanently destroys the vault: clears all credentials from SecureStore
 * and deletes the SQLite database file. Irreversible — UI must confirm.
 */
export async function deleteVaultCompletely(): Promise<void> {
  await resetVaultCredentials();
  await deleteDatabaseFile();
}
