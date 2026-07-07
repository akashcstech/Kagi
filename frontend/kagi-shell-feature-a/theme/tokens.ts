import { Platform } from 'react-native';

/**
 * Kagi design tokens.
 *
 * Palette is deliberately restrained: true neutral grays (not warm cream)
 * with three muted, desaturated signal colors used only where meaning
 * must be conveyed (danger / success / warning). Everything else in the
 * UI stays monochrome, per the app's branding decision.
 */

export const lightColors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceRaised: '#F2F2F3',
  border: '#E4E4E7',
  borderStrong: '#D0D1D6',
  textPrimary: '#17181C',
  textSecondary: '#6B6F76',
  textTertiary: '#9A9DA5',
  inverseText: '#FAFAFA',
  focus: '#17181C',
  danger: '#B3402C',
  dangerSurface: '#FBEAE6',
  success: '#3F7A57',
  successSurface: '#E9F3ED',
  warning: '#B08828',
  warningSurface: '#FBF3E1',
} as const;

export const darkColors = {
  background: '#101113',
  surface: '#1A1B1E',
  surfaceRaised: '#222327',
  border: '#2B2D31',
  borderStrong: '#3A3C41',
  textPrimary: '#F2F2F3',
  textSecondary: '#9A9DA5',
  textTertiary: '#6B6F76',
  inverseText: '#17181C',
  focus: '#F2F2F3',
  danger: '#D9694F',
  dangerSurface: '#2E1D1A',
  success: '#5FAE80',
  successSurface: '#1B2A21',
  warning: '#D1A94A',
  warningSurface: '#2E2717',
} as const;

export type ColorTokens = typeof lightColors;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const radii = {
  sm: 6,
  md: 10,
  lg: 14,
  pill: 999,
} as const;

/**
 * Two type roles: a system sans for UI chrome, and a monospace face
 * reserved for secret values (passwords, keys) so masked/revealed
 * characters are easy to scan and verify one-by-one.
 */
export const fontFamily = {
  sans: Platform.select({ ios: 'System', android: 'sans-serif', default: 'System' }),
  sansMedium: Platform.select({ ios: 'System', android: 'sans-serif-medium', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'Courier New' }),
} as const;

export const fontSize = {
  xs: 12,
  sm: 13,
  base: 15,
  md: 17,
  lg: 20,
  xl: 24,
  xxl: 30,
} as const;

export const fontWeight = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

export const secretTextStyle = {
  fontFamily: fontFamily.mono,
  letterSpacing: 1,
} as const;

/** Corner-bracket focus style — used instead of a default glow ring. */
export const focusBracketSize = 10;
