import { EntryRow } from '@/types/database';
import { Entry, EntryListItem } from '@/types/entry';
import { EncryptedPayload } from '@/types/encryption';

export interface FieldCipher {
  encrypt(plaintext: string): Promise<EncryptedPayload>;
  decrypt(payload: EncryptedPayload): string | Promise<string>;
}

function readPayload(ciphertext: string | null, iv: string | null, hmac: string | null): EncryptedPayload | null {
  if (ciphertext === null || iv === null || hmac === null) return null;
  return { ciphertext, iv, hmac };
}

async function decryptNullable(payload: EncryptedPayload | null, cipher: FieldCipher): Promise<string | null> {
  if (payload === null) return null;
  return cipher.decrypt(payload);
}

export async function mapEntryRowToEntry(row: EntryRow, tags: string[], cipher: FieldCipher): Promise<Entry> {
  const [password, key, notes] = await Promise.all([
    decryptNullable(readPayload(row.password_ciphertext, row.password_iv, row.password_hmac), cipher),
    decryptNullable(readPayload(row.key_ciphertext, row.key_iv, row.key_hmac), cipher),
    decryptNullable(readPayload(row.notes_ciphertext, row.notes_iv, row.notes_hmac), cipher),
  ]);

  return {
    id: row.id,
    title: row.title,
    username: row.username,
    website: row.website,
    folderId: row.folder_id,
    tags,
    password,
    key,
    notes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapEntryRowToListItem(row: EntryRow, tags: string[]): EntryListItem {
  return {
    id: row.id,
    title: row.title,
    username: row.username,
    folderId: row.folder_id,
    tags,
    hasPassword: row.password_ciphertext !== null,
    hasKey: row.key_ciphertext !== null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function encryptNullableField(
  plaintext: string | null | undefined,
  cipher: FieldCipher,
): Promise<{ ciphertext: string | null; iv: string | null; hmac: string | null }> {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return { ciphertext: null, iv: null, hmac: null };
  }
  const payload = await cipher.encrypt(plaintext);
  return { ciphertext: payload.ciphertext, iv: payload.iv, hmac: payload.hmac };
}
