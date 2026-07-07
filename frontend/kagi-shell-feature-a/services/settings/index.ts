export {
  APP_NAME,
  APP_VERSION,
  getSettingsSnapshot,
  getThemePreference,
  setThemePreference,
  getAutoLockDuration,
  setAutoLockDuration,
  isBiometricUnlockEnabled,
  enableBiometrics,
  disableBiometrics,
  changeMasterPasswordSafely,
  deleteVaultCompletely,
} from './settingsService';

export type { ThemePreference, SettingsSnapshot } from '@/types/settings';
export type { AutoLockDuration } from '@/types/autoLock';
