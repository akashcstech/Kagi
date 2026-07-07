import { getDatabase } from '@/database';
import { EntryRow } from '@/types/database';
import { BackupFolder } from '@/types/backup';

/**
 * Deletes all entries and folders from the vault.
 * Entry rows must be deleted before folders because of the RESTRICT foreign key.
 * Called inside a transaction so the vault is never partially wiped.
 */
export async function wipeAllVaultData(): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM entries;');
  await db.runAsync('DELETE FROM folders;');
}

/**
 * Inserts folders in topological order so that parent rows always exist before
 * child rows are inserted (required by the `parent_id` foreign key).
 *
 * Algorithm: iteratively scan remaining folders and insert any whose parent is
 * already in the `inserted` set (or is a root folder). A guard counter prevents
 * an infinite loop on genuinely circular data — any folders left in `remaining`
 * after the loop are inserted with parent_id = NULL as a safe fallback.
 */
export async function insertFoldersRespectingHierarchy(folders: BackupFolder[]): Promise<void> {
  const db = await getDatabase();

  const remaining = [...folders];
  const inserted = new Set<string>();
  let guard = folders.length + 1;

  while (remaining.length > 0 && guard > 0) {
    guard -= 1;

    for (let i = remaining.length - 1; i >= 0; i -= 1) {
      const folder = remaining[i];
      const canInsertNow = folder.parentId === null || inserted.has(folder.parentId);
      if (!canInsertNow) continue;

      await db.runAsync(
        `INSERT INTO folders (id, name, parent_id, sort_order, is_default, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?);`,
        [
          folder.id,
          folder.name,
          folder.parentId,
          folder.sortOrder,
          folder.isDefault ? 1 : 0,
          folder.createdAt,
          folder.updatedAt,
        ],
      );

      inserted.add(folder.id);
      remaining.splice(i, 1);
    }
  }

  // Fallback: insert any remaining folders as root-level to avoid leaving the
  // vault in an inconsistent state. This branch is only reachable if the backup
  // contains genuinely circular parent_id references (which the export prevents,
  // but defensive coding here covers corrupted files).
  if (remaining.length > 0) {
    for (const folder of remaining) {
      await db.runAsync(
        `INSERT INTO folders (id, name, parent_id, sort_order, is_default, created_at, updated_at)
         VALUES (?, ?, NULL, ?, ?, ?, ?);`,
        [folder.id, folder.name, folder.sortOrder, folder.isDefault ? 1 : 0, folder.createdAt, folder.updatedAt],
      );
    }
  }
}

/** Inserts a single re-encrypted entry row into the database. */
export async function insertRestoredEntryRow(row: EntryRow): Promise<void> {
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
      row.id,
      row.title,
      row.username,
      row.website,
      row.folder_id,
      row.password_ciphertext,
      row.password_iv,
      row.password_hmac,
      row.key_ciphertext,
      row.key_iv,
      row.key_hmac,
      row.notes_ciphertext,
      row.notes_iv,
      row.notes_hmac,
      row.created_at,
      row.updated_at,
    ],
  );
}

/** Inserts tags for a restored entry, deduplicating and trimming whitespace. */
export async function insertRestoredEntryTags(entryId: string, tags: string[]): Promise<void> {
  if (tags.length === 0) return;
  const db = await getDatabase();
  const uniqueTags = Array.from(new Set(tags.map((t) => t.trim()).filter((t) => t.length > 0)));
  for (const tag of uniqueTags) {
    await db.runAsync('INSERT INTO entry_tags (entry_id, tag) VALUES (?, ?);', [entryId, tag]);
  }
}
