import * as FileSystem from 'expo-file-system';
import { withTransaction } from '@/database';
import { getSessionCipher } from '@/services/auth';
import { decryptBackupEnvelope } from '@/services/backup';
import { validateEnvelopeShape, validatePayloadShape } from './backupValidation';
import {
  wipeAllVaultData,
  insertFoldersRespectingHierarchy,
  insertRestoredEntryRow,
  insertRestoredEntryTags,
} from './restoreQueries';
import { BackupPayload, InvalidBackupFileError } from '@/types/backup';
import { EntryRow } from '@/types/database';

export interface BackupPreview {
  /** The fully decrypted, validated payload — passed directly to restoreFromBackup() after confirmation. */
  payload: BackupPayload;
  folderCount: number;
  entryCount: number;
  exportedAt: number;
}

/**
 * Step 1 of 2: Read, parse, validate the envelope, and decrypt the backup file.
 * Non-destructive — does NOT touch the vault. Returns a BackupPreview with
 * enough metadata for the UI to show a meaningful confirmation dialog before
 * the user commits to replacing their vault.
 *
 * Throws:
 *   - InvalidBackupFileError  — unreadable file, bad JSON, or structural mismatch
 *   - WrongBackupPasswordError — HMAC failure (wrong password)
 */
export async function previewBackup(fileUri: string, backupPassword: string): Promise<BackupPreview> {
  let raw: string;
  try {
    raw = await FileSystem.readAsStringAsync(fileUri, { encoding: FileSystem.EncodingType.UTF8 });
  } catch {
    throw new InvalidBackupFileError('Could not read the selected file.');
  }

  let parsedEnvelope: unknown;
  try {
    parsedEnvelope = JSON.parse(raw);
  } catch {
    throw new InvalidBackupFileError('Selected file is not a valid Kagi backup (not JSON).');
  }

  const envelope = validateEnvelopeShape(parsedEnvelope);
  const decryptedRaw = await decryptBackupEnvelope(envelope, backupPassword);
  const payload = validatePayloadShape(decryptedRaw);

  return {
    payload,
    folderCount: payload.folders.length,
    entryCount: payload.entries.length,
    exportedAt: payload.exportedAt,
  };
}

/**
 * Step 2 of 2: Wipe the current vault and restore from the previewed payload.
 * Must only be called after the user explicitly confirms the destructive action.
 *
 * All writes are wrapped in a single transaction — if anything fails partway
 * (bad data, disk error, interrupted cipher), the database rolls back to its
 * pre-restore state rather than leaving a half-replaced vault.
 *
 * Secrets are re-encrypted under the current vault session keys (not the
 * backup password's keys) — a restored vault always speaks the master
 * password's encryption scheme.
 */
export async function restoreFromBackup(payload: BackupPayload): Promise<void> {
  const cipher = getSessionCipher();

  await withTransaction(async () => {
    await wipeAllVaultData();
    await insertFoldersRespectingHierarchy(payload.folders);

    for (const entry of payload.entries) {
      const [passwordPayload, keyPayload, notesPayload] = await Promise.all([
        entry.password !== null ? cipher.encrypt(entry.password) : Promise.resolve(null),
        entry.key !== null ? cipher.encrypt(entry.key) : Promise.resolve(null),
        entry.notes !== null ? cipher.encrypt(entry.notes) : Promise.resolve(null),
      ]);

      const row: EntryRow = {
        id: entry.id,
        title: entry.title,
        username: entry.username,
        website: entry.website,
        folder_id: entry.folderId,
        password_ciphertext: passwordPayload?.ciphertext ?? null,
        password_iv: passwordPayload?.iv ?? null,
        password_hmac: passwordPayload?.hmac ?? null,
        key_ciphertext: keyPayload?.ciphertext ?? null,
        key_iv: keyPayload?.iv ?? null,
        key_hmac: keyPayload?.hmac ?? null,
        notes_ciphertext: notesPayload?.ciphertext ?? null,
        notes_iv: notesPayload?.iv ?? null,
        notes_hmac: notesPayload?.hmac ?? null,
        created_at: entry.createdAt,
        updated_at: entry.updatedAt,
      };

      await insertRestoredEntryRow(row);
      await insertRestoredEntryTags(entry.id, entry.tags);
    }
  });
}
