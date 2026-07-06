export {
  isVaultInitialized,
  setupMasterPassword,
  login,
  loginWithBiometrics,
  lock,
  logout,
  isUnlocked,
  getSessionCipher,
  isBiometricUnlockEnabled,
  enableBiometrics,
  disableBiometrics,
  changeMasterPassword,
  resetVaultCredentials,
} from './authService';
export type { ChangeMasterPasswordResult } from './authService';

export { sessionManager } from './session';

export {
  evaluatePasswordStrength,
  masterPasswordFieldSchema,
  createMasterPasswordSchema,
  changeMasterPasswordSchema,
  MIN_MASTER_PASSWORD_LENGTH,
} from './passwordPolicy';
export type { CreateMasterPasswordInput, ChangeMasterPasswordInput } from './passwordPolicy';

export {
  VaultAlreadyInitializedError,
  VaultNotInitializedError,
  WrongPasswordError,
  SessionLockedError,
} from '@/types/auth';
export type { PasswordStrength, PasswordStrengthScore } from '@/types/auth';
