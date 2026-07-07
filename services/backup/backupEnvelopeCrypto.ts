import { generateSalt, deriveKeysFromPassword, encryptString, PBKDF2_ITERATIONS } from '@/services/encryption';
import { BackupPayload, BackupEnvelope, BACKUP_FORMAT_VERSION } from '@/types/backup';

export async function encryptBackupEnvelope(payload: BackupPayload, backupPassword: string): Promise<BackupEnvelope> {
  const salt = await generateSalt();
  const keys = await deriveKeysFromPassword(backupPassword, salt);

  const json = JSON.stringify(payload);
  const encryptedPayload = await encryptString(json, keys.encryptionKey, keys.macKey);

  return {
    kagiBackupVersion: BACKUP_FORMAT_VERSION,
    createdAt: Date.now(),
    salt,
    iterations: PBKDF2_ITERATIONS,
    payload: encryptedPayload,
  };
}

// decryptBackupEnvelope() belongs here (symmetric to the above) and will be
// added in Feature 12 (Import) to keep the format pairing in one file.
