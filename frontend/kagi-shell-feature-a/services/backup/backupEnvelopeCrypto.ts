import { generateSalt, deriveKeysFromPassword, encryptString, decryptString, PBKDF2_ITERATIONS, IntegrityError } from '@/services/encryption';
import { BackupPayload, BackupEnvelope, BACKUP_FORMAT_VERSION, WrongBackupPasswordError, InvalidBackupFileError } from '@/types/backup';

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

export async function decryptBackupEnvelope(envelope: BackupEnvelope, backupPassword: string): Promise<BackupPayload> {
  const keys = await deriveKeysFromPassword(backupPassword, envelope.salt);

  let json: string;
  try {
    json = await decryptString(envelope.payload, keys.encryptionKey, keys.macKey);
  } catch (err) {
    if (err instanceof IntegrityError) {
      throw new WrongBackupPasswordError();
    }
    throw err;
  }

  try {
    return JSON.parse(json) as BackupPayload;
  } catch {
    throw new InvalidBackupFileError('Backup file contents could not be parsed after decryption.');
  }
}

