import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { MIN_MASTER_PASSWORD_LENGTH } from '@/services/auth';
import { buildBackupPayload } from './backupPayloadBuilder';
import { encryptBackupEnvelope } from './backupEnvelopeCrypto';
import { BackupEnvelope, BackupPasswordTooShortError, BACKUP_FILE_EXTENSION } from '@/types/backup';

function assertValidBackupPassword(password: string): void {
  if (password.length < MIN_MASTER_PASSWORD_LENGTH) {
    throw new BackupPasswordTooShortError(MIN_MASTER_PASSWORD_LENGTH);
  }
}

function buildBackupFileName(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(
    now.getMinutes(),
  )}${pad(now.getSeconds())}`;
  return `Kagi-Backup-${stamp}${BACKUP_FILE_EXTENSION}`;
}

export async function exportBackup(backupPassword: string): Promise<{ uri: string; fileName: string }> {
  assertValidBackupPassword(backupPassword);

  const payload = await buildBackupPayload();
  const envelope: BackupEnvelope = await encryptBackupEnvelope(payload, backupPassword);

  const fileName = buildBackupFileName();
  const uri = `${FileSystem.documentDirectory}${fileName}`;

  await FileSystem.writeAsStringAsync(uri, JSON.stringify(envelope), {
    encoding: FileSystem.EncodingType.UTF8,
  });

  return { uri, fileName };
}

export async function shareBackupFile(uri: string): Promise<void> {
  const available = await Sharing.isAvailableAsync();
  if (!available) {
    return;
  }

  await Sharing.shareAsync(uri, {
    mimeType: 'application/octet-stream',
    dialogTitle: 'Save Kagi Backup',
    UTI: 'public.data',
  });
}

export async function exportAndShareBackup(backupPassword: string): Promise<{ uri: string; fileName: string }> {
  const result = await exportBackup(backupPassword);
  await shareBackupFile(result.uri);
  return result;
}
