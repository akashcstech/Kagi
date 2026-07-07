import { getDatabase } from '@/database';
import { EntryRow } from '@/types/database';

export async function findEntryRowById(id: string): Promise<EntryRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<EntryRow>('SELECT * FROM entries WHERE id = ?;', [id]);
  return row ?? null;
}

export async function findEntryRowsByFolder(folderId: string): Promise<EntryRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<EntryRow>('SELECT * FROM entries WHERE folder_id = ? ORDER BY title COLLATE NOCASE ASC;', [
    folderId,
  ]);
}

export async function findAllEntryRows(): Promise<EntryRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<EntryRow>('SELECT * FROM entries ORDER BY title COLLATE NOCASE ASC;');
}

export async function findTagsForEntry(entryId: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ tag: string }>(
    'SELECT tag FROM entry_tags WHERE entry_id = ? ORDER BY tag COLLATE NOCASE ASC;',
    [entryId],
  );
  return rows.map((r) => r.tag);
}

export async function findTagsForEntries(entryIds: string[]): Promise<Record<string, string[]>> {
  if (entryIds.length === 0) return {};
  const db = await getDatabase();
  const placeholders = entryIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<{ entry_id: string; tag: string }>(
    `SELECT entry_id, tag FROM entry_tags WHERE entry_id IN (${placeholders}) ORDER BY tag COLLATE NOCASE ASC;`,
    entryIds,
  );
  const byEntry: Record<string, string[]> = {};
  for (const row of rows) {
    (byEntry[row.entry_id] ??= []).push(row.tag);
  }
  return byEntry;
}

export async function insertEntryRow(row: EntryRow): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO entries (
      id, title, username, website, folder_id,
      password_ciphertext, password_iv, password_hmac,
      key_ciphertext, key_iv, key_hmac,
      notes_ciphertext, notes_iv, notes_hmac,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      row.id, row.title, row.username, row.website, row.folder_id,
      row.password_ciphertext, row.password_iv, row.password_hmac,
      row.key_ciphertext, row.key_iv, row.key_hmac,
      row.notes_ciphertext, row.notes_iv, row.notes_hmac,
      row.created_at, row.updated_at,
    ],
  );
}

export async function updateEntryRow(row: EntryRow): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `UPDATE entries SET
      title = ?, username = ?, website = ?, folder_id = ?,
      password_ciphertext = ?, password_iv = ?, password_hmac = ?,
      key_ciphertext = ?, key_iv = ?, key_hmac = ?,
      notes_ciphertext = ?, notes_iv = ?, notes_hmac = ?,
      updated_at = ?
    WHERE id = ?;`,
    [
      row.title, row.username, row.website, row.folder_id,
      row.password_ciphertext, row.password_iv, row.password_hmac,
      row.key_ciphertext, row.key_iv, row.key_hmac,
      row.notes_ciphertext, row.notes_iv, row.notes_hmac,
      row.updated_at, row.id,
    ],
  );
}

export async function deleteEntryRow(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM entries WHERE id = ?;', [id]);
}

export async function replaceEntryTags(entryId: string, tags: string[]): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM entry_tags WHERE entry_id = ?;', [entryId]);

  const uniqueTags = Array.from(new Set(tags.map((t) => t.trim()).filter((t) => t.length > 0)));
  for (const tag of uniqueTags) {
    await db.runAsync('INSERT INTO entry_tags (entry_id, tag) VALUES (?, ?);', [entryId, tag]);
  }
}

export async function findAllDistinctTags(): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ tag: string }>(
    'SELECT DISTINCT tag FROM entry_tags ORDER BY tag COLLATE NOCASE ASC;',
  );
  return rows.map((r) => r.tag);
}
