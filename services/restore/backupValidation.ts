import { BackupEnvelope, BackupPayload, InvalidBackupFileError } from '@/types/backup';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Validates the outer envelope shape of an untrusted JSON value before
 * attempting decryption. Throws InvalidBackupFileError with a descriptive
 * message on any structural mismatch.
 */
export function validateEnvelopeShape(raw: unknown): BackupEnvelope {
  if (!isObject(raw)) {
    throw new InvalidBackupFileError();
  }

  const { kagiBackupVersion, createdAt, salt, iterations, payload } = raw;

  if (typeof kagiBackupVersion !== 'number') {
    throw new InvalidBackupFileError('Missing or invalid backup format version.');
  }
  if (typeof createdAt !== 'number') {
    throw new InvalidBackupFileError('Missing or invalid backup timestamp.');
  }
  if (typeof salt !== 'string' || salt.length === 0) {
    throw new InvalidBackupFileError('Missing or invalid encryption salt.');
  }
  if (typeof iterations !== 'number' || iterations <= 0) {
    throw new InvalidBackupFileError('Missing or invalid iteration count.');
  }
  if (
    !isObject(payload) ||
    typeof payload.ciphertext !== 'string' ||
    typeof payload.iv !== 'string' ||
    typeof payload.hmac !== 'string'
  ) {
    throw new InvalidBackupFileError('Missing or invalid encrypted payload.');
  }

  return raw as unknown as BackupEnvelope;
}

/**
 * Validates the decrypted payload shape after successful decryption.
 * A structurally invalid payload at this point means the file was corrupted
 * or tampered with at the payload level, which is distinct from a wrong password.
 */
export function validatePayloadShape(raw: unknown): BackupPayload {
  if (!isObject(raw)) {
    throw new InvalidBackupFileError();
  }

  const { schemaVersion, exportedAt, folders, entries } = raw;

  if (typeof schemaVersion !== 'number') {
    throw new InvalidBackupFileError('Backup is missing a schema version.');
  }
  if (typeof exportedAt !== 'number') {
    throw new InvalidBackupFileError('Backup is missing an export timestamp.');
  }
  if (!Array.isArray(folders)) {
    throw new InvalidBackupFileError('Backup is missing its folder list.');
  }
  if (!Array.isArray(entries)) {
    throw new InvalidBackupFileError('Backup is missing its entry list.');
  }

  return raw as unknown as BackupPayload;
}
