/** Thrown for any SecureStore read/write/delete failure. */
export class SecureStoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SecureStoreError';
  }
}

/**
 * Thrown specifically when reading a biometric-protected value and the OS
 * cancels or fails the biometric prompt (user cancelled, too many failed
 * attempts, hardware unavailable, etc). Callers should treat this as
 * "fall back to master password", not as a hard error.
 */
export class BiometricUnavailableError extends Error {
  constructor(message = 'Biometric unlock is unavailable or was cancelled.') {
    super(message);
    this.name = 'BiometricUnavailableError';
  }
}
