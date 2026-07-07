export { exportBackup, shareBackupFile, exportAndShareBackup } from './backupService';
export { buildBackupPayload } from './backupPayloadBuilder';
export { encryptBackupEnvelope } from './backupEnvelopeCrypto';

export type { BackupPayload, BackupFolder, BackupEntry, BackupEnvelope } from '@/types/backup';
export {
  BACKUP_FILE_EXTENSION,
  BACKUP_FORMAT_VERSION,
  BackupPasswordTooShortError,
  InvalidBackupFileError,
  WrongBackupPasswordError,
} from '@/types/backup';
