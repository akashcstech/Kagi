import Module from 'module';

// ----------------------------------------------------------------------------
// Mock expo-secure-store module before loading credential store
// ----------------------------------------------------------------------------
const mockStorage = new Map<string, string>();
let shouldFailBiometrics = false;

const secureStoreMock = {
  async setItemAsync(key: string, value: string, options: any) {
    mockStorage.set(key, value);
  },
  async getItemAsync(key: string, options: any) {
    if (options?.requireAuthentication && shouldFailBiometrics) {
      throw new Error('Biometric authentication failed by user cancel');
    }
    return mockStorage.get(key) || null;
  },
  async deleteItemAsync(key: string, options: any) {
    mockStorage.delete(key);
  }
};

const originalRequire = Module.prototype.require;
(Module.prototype as any).require = function (id: string) {
  if (id === 'expo-secure-store') {
    return secureStoreMock;
  }
  return originalRequire.apply(this, arguments as any);
};

// Now import the real components
import {
  saveMasterKeyRecord,
  loadMasterKeyRecord,
  hasMasterKeyRecord,
  clearMasterKeyRecord,
  isBiometricEnabled,
  enableBiometricUnlock,
  disableBiometricUnlock,
  loadBiometricProtectedKeys,
  clearAllCredentials
} from '../services/secureStore/index';
import { BiometricUnavailableError, SecureStoreError } from '../types/secureStore';
import { DerivedKeyPair, MasterKeyRecord } from '../types/encryption';

async function runTests() {
  console.log('=== Starting SecureStore Core Verification Tests ===\n');

  const testRecord: MasterKeyRecord = {
    salt: 'aabbccddeeff',
    verificationHash: '1234567890abcdef',
    iterations: 100000
  };

  const testKeys: DerivedKeyPair = {
    encryptionKey: '11111111111111111111111111111111',
    macKey: '22222222222222222222222222222222'
  };

  try {
    // Clean state
    mockStorage.clear();
    shouldFailBiometrics = false;

    // Test 1: Empty state checks
    console.log('[Test 1] Checking initial empty states...');
    const recordExists = await hasMasterKeyRecord();
    if (recordExists) throw new Error('Master record should not exist initially.');
    
    const bioInitiallyEnabled = await isBiometricEnabled();
    if (bioInitiallyEnabled) throw new Error('Biometrics should be disabled initially.');
    console.log('✓ Initial states validated.');

    // Test 2: Master key record saving & retrieval
    console.log('\n[Test 2] Testing master key record saving and load...');
    await saveMasterKeyRecord(testRecord);
    const hasRecord = await hasMasterKeyRecord();
    if (!hasRecord) throw new Error('Master record should be found.');
    
    const loaded = await loadMasterKeyRecord();
    if (!loaded || loaded.salt !== testRecord.salt || loaded.verificationHash !== testRecord.verificationHash) {
      throw new Error('Retrieved record did not match original.');
    }
    console.log('✓ Saving and loading master record validated.');

    // Test 3: Clear master key record
    console.log('\n[Test 3] Testing clearing master key record...');
    await clearMasterKeyRecord();
    if (await hasMasterKeyRecord()) throw new Error('Master record was not cleared.');
    console.log('✓ Clearing master record validated.');

    // Test 4: Enable Biometrics and Load Protected Keys
    console.log('\n[Test 4] Testing biometric unlock enablement...');
    await enableBiometricUnlock(testKeys);
    
    const isBioActive = await isBiometricEnabled();
    if (!isBioActive) throw new Error('Biometric flag should be enabled.');

    const loadedKeys = await loadBiometricProtectedKeys();
    if (!loadedKeys || loadedKeys.encryptionKey !== testKeys.encryptionKey) {
      throw new Error('Protected keys could not be read or matched.');
    }
    console.log('✓ Biometric keys stored and loaded successfully.');

    // Test 5: Verify cancellation of biometric prompt triggers BiometricUnavailableError
    console.log('\n[Test 5] Testing biometric cancel handling...');
    shouldFailBiometrics = true;
    try {
      await loadBiometricProtectedKeys();
      throw new Error('Should have failed to load keys on biometric failure.');
    } catch (err) {
      if (err instanceof BiometricUnavailableError) {
        console.log('✓ Correctly raised BiometricUnavailableError on biometric cancel.');
      } else {
        throw new Error(`Expected BiometricUnavailableError but got: ${err}`);
      }
    }
    shouldFailBiometrics = false;

    // Test 6: Disable biometric unlock
    console.log('\n[Test 6] Testing biometric disabling...');
    await disableBiometricUnlock();
    const isBioActiveAfterDisable = await isBiometricEnabled();
    if (isBioActiveAfterDisable) throw new Error('Biometric flag should be disabled.');
    
    const noKeys = await loadBiometricProtectedKeys();
    if (noKeys !== null) throw new Error('Biometric protected keys should return null after disabling.');
    console.log('✓ Biometric disabling validated.');

    // Test 7: Clear all credentials
    console.log('\n[Test 7] Testing clear all credentials...');
    // Re-fill storage
    await saveMasterKeyRecord(testRecord);
    await enableBiometricUnlock(testKeys);

    await clearAllCredentials();
    if (await hasMasterKeyRecord()) throw new Error('Master record not wiped.');
    if (await isBiometricEnabled()) throw new Error('Biometrics not disabled.');
    if (await loadBiometricProtectedKeys() !== null) throw new Error('Protected keys not wiped.');
    console.log('✓ Full wipe validated.');

    console.log('\n=== All SecureStore Tests Passed Successfully! ===');
  } catch (error) {
    console.error('\n❌ Test Failure:', error);
    process.exit(1);
  }
}

runTests();
