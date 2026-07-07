import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';

import { getThemePreference, setThemePreference } from '@/services/settings';
import type { ThemePreference } from '@/types/settings';

import { darkColors, lightColors, fontFamily, fontSize, fontWeight, radii, spacing } from './tokens';
import type { ColorTokens } from './tokens';

type ResolvedScheme = 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  scheme: ResolvedScheme;
  colors: ColorTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  fontFamily: typeof fontFamily;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  setPreference: (preference: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveScheme(preference: ThemePreference, systemScheme: ColorSchemeName): ResolvedScheme {
  if (preference === 'system') {
    return systemScheme === 'dark' ? 'dark' : 'light';
  }
  return preference;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [systemScheme, setSystemScheme] = useState<ColorSchemeName>(Appearance.getColorScheme());

  useEffect(() => {
    let mounted = true;
    getThemePreference().then((stored) => {
      if (mounted) setPreferenceState(stored);
    });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme);
    });
    return () => subscription.remove();
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await setThemePreference(next);
  }, []);

  const scheme = resolveScheme(preference, systemScheme);
  const colors = scheme === 'dark' ? darkColors : lightColors;

  const value = useMemo<ThemeContextValue>(
    () => ({ preference, scheme, colors, spacing, radii, fontFamily, fontSize, fontWeight, setPreference }),
    [preference, scheme, colors, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return ctx;
}
