import { EncryptedPayload } from './encryption';

export const BACKUP_FILE_EXTENSION = '.kagi';
export const BACKUP_FORMAT_VERSION = 1;

export interface BackupFolder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface BackupEntry {
  id: string;
  title: string;
  username: string | null;
  website: string | null;
  folderId: string;
  tags: string[];
  password: string | null;
  key: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface BackupPayload {
  schemaVersion: number;
  exportedAt: number;
  folders: BackupFolder[];
  entries: BackupEntry[];
}

export interface BackupEnvelope {
  kagiBackupVersion: typeof BACKUP_FORMAT_VERSION;
  createdAt: number;
  salt: string;
  iterations: number;
  payload: EncryptedPayload;
}

export class BackupPasswordTooShortError extends Error {
  constructor(minLength: number) {
    super(`Backup password must be at least ${minLength} characters.`);
    this.name = 'BackupPasswordTooShortError';
  }
}

export class InvalidBackupFileError extends Error {
  constructor(message = 'This file is not a valid Kagi backup.') {
    super(message);
    this.name = 'InvalidBackupFileError';
  }
}

export class WrongBackupPasswordError extends Error {
  constructor(message = 'Incorrect backup password.') {
    super(message);
    this.name = 'WrongBackupPasswordError';
  }
}
