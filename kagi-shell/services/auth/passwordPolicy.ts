import { z } from 'zod';
import { PasswordStrength, PasswordStrengthScore } from '@/types/auth';

export const MIN_MASTER_PASSWORD_LENGTH = 8;

export const masterPasswordFieldSchema = z
  .string()
  .min(MIN_MASTER_PASSWORD_LENGTH, `Master password must be at least ${MIN_MASTER_PASSWORD_LENGTH} characters.`);

export const createMasterPasswordSchema = z
  .object({
    password: masterPasswordFieldSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type CreateMasterPasswordInput = z.infer<typeof createMasterPasswordSchema>;

export const changeMasterPasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required.'),
    newPassword: masterPasswordFieldSchema,
    confirmNewPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'New passwords do not match.',
    path: ['confirmNewPassword'],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: 'New password must be different from the current password.',
    path: ['newPassword'],
  });

export type ChangeMasterPasswordInput = z.infer<typeof changeMasterPasswordSchema>;

export function evaluatePasswordStrength(password: string): PasswordStrength {
  const suggestions: string[] = [];

  if (password.length < MIN_MASTER_PASSWORD_LENGTH) {
    return {
      score: 0,
      label: 'Very Weak',
      suggestions: [`Use at least ${MIN_MASTER_PASSWORD_LENGTH} characters.`],
    };
  }

  let score = 1;

  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasDigit = /[0-9]/.test(password);
  const hasSymbol = /[^a-zA-Z0-9]/.test(password);

  if (password.length >= 12) score += 1;
  else suggestions.push('Use 12+ characters for a stronger password.');

  if (hasLower && hasUpper) score += 1;
  else suggestions.push('Mix uppercase and lowercase letters.');

  if (hasDigit) score += 1;
  else suggestions.push('Add at least one number.');

  if (hasSymbol) score += 1;
  else suggestions.push('Add at least one symbol (e.g. ! @ # $).');

  const clampedScore = Math.min(score, 4) as PasswordStrengthScore;

  const labels: Record<PasswordStrengthScore, PasswordStrength['label']> = {
    0: 'Very Weak',
    1: 'Weak',
    2: 'Fair',
    3: 'Strong',
    4: 'Very Strong',
  };

  return {
    score: clampedScore,
    label: labels[clampedScore],
    suggestions: clampedScore === 4 ? [] : suggestions,
  };
}
