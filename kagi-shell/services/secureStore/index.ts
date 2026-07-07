/**
 * Public entry point for the secure credential store.
 * Other features (auth service, settings) should import only from here.
 */
export {
  saveMasterKeyRecord,
  loadMasterKeyRecord,
  hasMasterKeyRecord,
  clearMasterKeyRecord,
  isBiometricEnabled,
  enableBiometricUnlock,
  disableBiometricUnlock,
  loadBiometricProtectedKeys,
  clearAllCredentials,
} from './credentialStore';

export { SecureStoreError, BiometricUnavailableError } from '@/types/secureStore';
