import { getSetting, setSetting } from '@/database';
import { ThemePreference, DEFAULT_THEME, THEME_SETTING_KEY } from '@/types/settings';

function isThemePreference(value: string): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

export async function getThemePreference(): Promise<ThemePreference> {
  const raw = await getSetting(THEME_SETTING_KEY);
  if (raw !== null && isThemePreference(raw)) {
    return raw;
  }
  return DEFAULT_THEME;
}

export async function setThemePreference(theme: ThemePreference): Promise<void> {
  await setSetting(THEME_SETTING_KEY, theme);
}
