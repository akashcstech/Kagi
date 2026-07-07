import { AutoLockDuration } from './autoLock';

export type ThemePreference = 'light' | 'dark' | 'system';

export const DEFAULT_THEME: ThemePreference = 'system';
export const THEME_SETTING_KEY = 'theme_preference';

export interface SettingsSnapshot {
  theme: ThemePreference;
  autoLockDuration: AutoLockDuration;
  biometricEnabled: boolean;
}
