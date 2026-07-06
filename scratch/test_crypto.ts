import {
  createMasterPassword,
  verifyMasterPassword,
  createFieldCipher,
  IntegrityError,
  EncryptionError
} from '../services/encryption/index';

async function runTests() {
  console.log('=== Starting Encryption Core Verification Tests ===\n');

  const password = 'SuperSecretMasterPassword123!';
  const wrongPassword = 'WrongPassword456!';
  const originalText = 'Sensitive Vault Data: API_KEY_ABC123';

  try {
    // Test 1: Create Master Password & Keys
    console.log('[Test 1] Creating Master Password & Keys...');
    const { record, keys } = await createMasterPassword(password);
    console.log('✓ Master record generated successfully:');
    console.log(`  - Salt (hex): ${record.salt}`);
    console.log(`  - Iterations: ${record.iterations}`);
    console.log(`  - Verification Hash: ${record.verificationHash}`);
    console.log(`  - Derived Encryption Key: ${keys.encryptionKey}`);
    console.log(`  - Derived MAC Key: ${keys.macKey}\n`);

    // Test 2: Verify Correct Password
    console.log('[Test 2] Verifying with correct password...');
    const verifiedKeys = await verifyMasterPassword(password, record);
    if (!verifiedKeys) {
      throw new Error('Verification failed for the correct password!');
    }
    if (
      verifiedKeys.encryptionKey !== keys.encryptionKey ||
      verifiedKeys.macKey !== keys.macKey
    ) {
      throw new Error('Verified keys do not match originally derived keys!');
    }
    console.log('✓ Verification succeeded and keys matched perfectly.\n');

    // Test 3: Verify Incorrect Password
    console.log('[Test 3] Verifying with incorrect password...');
    const failedKeys = await verifyMasterPassword(wrongPassword, record);
    if (failedKeys !== null) {
      throw new Error('Verification succeeded for an incorrect password!');
    }
    console.log('✓ Verification correctly failed (returned null) for incorrect password.\n');

    // Test 4: Encrypt and Decrypt Fields
    console.log('[Test 4] Encrypting and decrypting data fields...');
    const cipher = createFieldCipher(keys);
    const encrypted = await cipher.encrypt(originalText);
    console.log('✓ Encryption complete:');
    console.log(`  - Ciphertext: ${encrypted.ciphertext}`);
    console.log(`  - IV: ${encrypted.iv}`);
    console.log(`  - HMAC: ${encrypted.hmac}`);

    const decrypted = cipher.decrypt(encrypted);
    console.log(`  - Decrypted Plaintext: "${decrypted}"`);
    if (decrypted !== originalText) {
      throw new Error('Decrypted text does not match original plaintext!');
    }
    console.log('✓ Decryption succeeded and data is intact.\n');

    // Test 5: Verify Integrity Check / Tampering Detection
    console.log('[Test 5] Testing integrity tampering detection...');
    
    // Attempt 5a: Corrupt the ciphertext
    const tamperedPayload1 = { ...encrypted, ciphertext: encrypted.ciphertext.replace(/.$/, 'a') };
    try {
      cipher.decrypt(tamperedPayload1);
      throw new Error('Decrypted successfully despite tampered ciphertext!');
    } catch (e) {
      if (e instanceof IntegrityError) {
        console.log('✓ Correctly caught IntegrityError on tampered ciphertext.');
      } else {
        throw new Error(`Expected IntegrityError, but got: ${e}`);
      }
    }

    // Attempt 5b: Corrupt the HMAC signature
    const tamperedPayload2 = { ...encrypted, hmac: encrypted.hmac.replace(/.$/, '0') };
    try {
      cipher.decrypt(tamperedPayload2);
      throw new Error('Decrypted successfully despite tampered HMAC!');
    } catch (e) {
      if (e instanceof IntegrityError) {
        console.log('✓ Correctly caught IntegrityError on tampered HMAC.');
      } else {
        throw new Error(`Expected IntegrityError, but got: ${e}`);
      }
    }

    console.log('\n=== All Tests Passed Successfully! ===');
  } catch (error) {
    console.error('\n❌ Test Failure:', error);
    process.exit(1);
  }
}

runTests();
