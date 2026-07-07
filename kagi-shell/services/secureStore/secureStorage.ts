import * as SecureStore from 'expo-secure-store';
import { KEYCHAIN_SERVICE } from './constants';
import { SecureStoreError, BiometricUnavailableError } from '@/types/secureStore';

/**
 * Thin, typed wrapper around expo-secure-store so the rest of the app never
 * touches the raw SecureStore API directly. Every Kagi value lives under the
 * same keychainService namespace.
 */

export interface ReadOptions {
  /** If true, the OS will require Face ID / fingerprint / device credential before returning the value. */
  requireAuthentication?: boolean;
  /** Message shown in the native biometric prompt. Only used when requireAuthentication is true. */
  authenticationPrompt?: string;
}

async function setRaw(key: string, value: string, requireAuthentication = false): Promise<void> {
  try {
    await SecureStore.setItemAsync(key, value, {
      keychainService: KEYCHAIN_SERVICE,
      requireAuthentication,
    });
  } catch (err) {
    throw new SecureStoreError(`Failed to write "${key}": ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function getRaw(key: string, options: ReadOptions = {}): Promise<string | null> {
  try {
    const value = await SecureStore.getItemAsync(key, {
      keychainService: KEYCHAIN_SERVICE,
      requireAuthentication: options.requireAuthentication ?? false,
      authenticationPrompt: options.authenticationPrompt,
    });
    return value;
  } catch (err) {
    if (options.requireAuthentication) {
      // A failed/cancelled biometric prompt throws here on both platforms —
      // surface it as a distinct, expected error so callers can fall back
      // to the master password screen instead of showing a scary crash.
      throw new BiometricUnavailableError();
    }
    throw new SecureStoreError(`Failed to read "${key}": ${err instanceof Error ? err.message : String(err)}`);
  }
}

async function deleteRaw(key: string): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(key, { keychainService: KEYCHAIN_SERVICE });
  } catch (err) {
    throw new SecureStoreError(`Failed to delete "${key}": ${err instanceof Error ? err.message : String(err)}`);
  }
}

export const secureStorage = { setRaw, getRaw, deleteRaw };
