import { generateId } from '@/utils/id';
import { DEFAULT_FOLDER_ID, withTransaction } from '@/database';
import { EntryRow } from '@/types/database';
import { DerivedKeyPair } from '@/types/encryption';
import { createFieldCipher } from '@/services/encryption';
import { getSessionCipher } from '@/services/auth';
import { getFolder } from '@/services/folders';
import {
  Entry, EntryListItem, CreateEntryInput, UpdateEntryInput,
  EntryNotFoundError, InvalidEntryTitleError,
} from '@/types/entry';
import { mapEntryRowToEntry, mapEntryRowToListItem, encryptNullableField, FieldCipher } from './entryMapper';
import {
  findEntryRowById, findEntryRowsByFolder, findAllEntryRows,
  findTagsForEntry, findTagsForEntries, insertEntryRow, updateEntryRow,
  deleteEntryRow, replaceEntryTags, findAllDistinctTags,
} from './entryQueries';

function assertValidTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length === 0) {
    throw new InvalidEntryTitleError();
  }
  return trimmed;
}

function normalize(value: string | null | undefined): string | null {
  if (value === undefined || value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function requireEntryRow(id: string): Promise<EntryRow> {
  const row = await findEntryRowById(id);
  if (!row) throw new EntryNotFoundError(id);
  return row;
}

export async function createEntry(input: CreateEntryInput): Promise<Entry> {
  const title = assertValidTitle(input.title);
  const cipher = getSessionCipher();

  const folderId = input.folderId ?? DEFAULT_FOLDER_ID;
  await getFolder(folderId);

  const [passwordFields, keyFields, notesFields] = await Promise.all([
    encryptNullableField(input.password, cipher),
    encryptNullableField(input.key, cipher),
    encryptNullableField(input.notes, cipher),
  ]);

  const now = Date.now();
  const id = generateId();

  const row: EntryRow = {
    id, title,
    username: normalize(input.username),
    website: normalize(input.website),
    folder_id: folderId,
    password_ciphertext: passwordFields.ciphertext, password_iv: passwordFields.iv, password_hmac: passwordFields.hmac,
    key_ciphertext: keyFields.ciphertext, key_iv: keyFields.iv, key_hmac: keyFields.hmac,
    notes_ciphertext: notesFields.ciphertext, notes_iv: notesFields.iv, notes_hmac: notesFields.hmac,
    created_at: now, updated_at: now,
  };

  await withTransaction(async () => {
    await insertEntryRow(row);
    await replaceEntryTags(id, input.tags ?? []);
  });

  return getEntry(id);
}

export async function getEntry(id: string): Promise<Entry> {
  const cipher = getSessionCipher();
  const row = await requireEntryRow(id);
  const tags = await findTagsForEntry(id);
  return mapEntryRowToEntry(row, tags, cipher);
}

export async function listEntriesByFolder(folderId: string): Promise<EntryListItem[]> {
  const rows = await findEntryRowsByFolder(folderId);
  const tagsByEntry = await findTagsForEntries(rows.map((r) => r.id));
  return rows.map((row) => mapEntryRowToListItem(row, tagsByEntry[row.id] ?? []));
}

export async function listAllEntries(): Promise<EntryListItem[]> {
  const rows = await findAllEntryRows();
  const tagsByEntry = await findTagsForEntries(rows.map((r) => r.id));
  return rows.map((row) => mapEntryRowToListItem(row, tagsByEntry[row.id] ?? []));
}

export async function listAllTags(): Promise<string[]> {
  return findAllDistinctTags();
}

export async function updateEntry(id: string, updates: UpdateEntryInput): Promise<Entry> {
  const cipher = getSessionCipher();
  const existing = await requireEntryRow(id);

  if (updates.folderId !== undefined) {
    await getFolder(updates.folderId);
  }

  const [passwordFields, keyFields, notesFields] = await Promise.all([
    updates.password !== undefined
      ? encryptNullableField(updates.password, cipher)
      : { ciphertext: existing.password_ciphertext, iv: existing.password_iv, hmac: existing.password_hmac },
    updates.key !== undefined
      ? encryptNullableField(updates.key, cipher)
      : { ciphertext: existing.key_ciphertext, iv: existing.key_iv, hmac: existing.key_hmac },
    updates.notes !== undefined
      ? encryptNullableField(updates.notes, cipher)
      : { ciphertext: existing.notes_ciphertext, iv: existing.notes_iv, hmac: existing.notes_hmac },
  ]);

  const updatedRow: EntryRow = {
    ...existing,
    title: updates.title !== undefined ? assertValidTitle(updates.title) : existing.title,
    username: updates.username !== undefined ? normalize(updates.username) : existing.username,
    website: updates.website !== undefined ? normalize(updates.website) : existing.website,
    folder_id: updates.folderId ?? existing.folder_id,
    password_ciphertext: passwordFields.ciphertext, password_iv: passwordFields.iv, password_hmac: passwordFields.hmac,
    key_ciphertext: keyFields.ciphertext, key_iv: keyFields.iv, key_hmac: keyFields.hmac,
    notes_ciphertext: notesFields.ciphertext, notes_iv: notesFields.iv, notes_hmac: notesFields.hmac,
    updated_at: Date.now(),
  };

  await withTransaction(async () => {
    await updateEntryRow(updatedRow);
    if (updates.tags !== undefined) {
      await replaceEntryTags(id, updates.tags);
    }
  });

  return getEntry(id);
}

export async function deleteEntry(id: string): Promise<void> {
  await requireEntryRow(id);
  await deleteEntryRow(id);
}

export async function reencryptAllEntries(oldKeys: DerivedKeyPair, newKeys: DerivedKeyPair): Promise<void> {
  const oldCipher: FieldCipher = createFieldCipher(oldKeys);
  const newCipher: FieldCipher = createFieldCipher(newKeys);

  const rows = await findAllEntryRows();

  await withTransaction(async () => {
    for (const row of rows) {
      const decrypted = await mapEntryRowToEntry(row, [], oldCipher);

      const [passwordFields, keyFields, notesFields] = await Promise.all([
        encryptNullableField(decrypted.password, newCipher),
        encryptNullableField(decrypted.key, newCipher),
        encryptNullableField(decrypted.notes, newCipher),
      ]);

      await updateEntryRow({
        ...row,
        password_ciphertext: passwordFields.ciphertext, password_iv: passwordFields.iv, password_hmac: passwordFields.hmac,
        key_ciphertext: keyFields.ciphertext, key_iv: keyFields.iv, key_hmac: keyFields.hmac,
        notes_ciphertext: notesFields.ciphertext, notes_iv: notesFields.iv, notes_hmac: notesFields.hmac,
      });
    }
  });
}
