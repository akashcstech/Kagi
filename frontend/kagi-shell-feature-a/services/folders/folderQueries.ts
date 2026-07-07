import { getDatabase } from '@/database';
import { FolderRow } from '@/types/database';

export async function findFolderRowById(id: string): Promise<FolderRow | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<FolderRow>('SELECT * FROM folders WHERE id = ?;', [id]);
  return row ?? null;
}

export async function findAllFolderRows(): Promise<FolderRow[]> {
  const db = await getDatabase();
  return db.getAllAsync<FolderRow>('SELECT * FROM folders ORDER BY parent_id IS NULL DESC, parent_id, sort_order ASC;');
}

export async function findChildFolderRows(parentId: string | null): Promise<FolderRow[]> {
  const db = await getDatabase();
  if (parentId === null) {
    return db.getAllAsync<FolderRow>('SELECT * FROM folders WHERE parent_id IS NULL ORDER BY sort_order ASC;');
  }
  return db.getAllAsync<FolderRow>('SELECT * FROM folders WHERE parent_id = ? ORDER BY sort_order ASC;', [parentId]);
}

export async function findEntryCountsByFolder(): Promise<Record<string, number>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ folder_id: string; count: number }>(
    'SELECT folder_id, COUNT(*) as count FROM entries GROUP BY folder_id;',
  );
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.folder_id] = row.count;
  }
  return counts;
}

export async function findMaxSortOrder(parentId: string | null): Promise<number | null> {
  const db = await getDatabase();
  const row = parentId === null
    ? await db.getFirstAsync<{ max_order: number | null }>(
        'SELECT MAX(sort_order) as max_order FROM folders WHERE parent_id IS NULL;',
      )
    : await db.getFirstAsync<{ max_order: number | null }>(
        'SELECT MAX(sort_order) as max_order FROM folders WHERE parent_id = ?;',
        [parentId],
      );
  return row?.max_order ?? null;
}

export async function computeFolderDepth(id: string): Promise<number> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ depth: number }>(
    `
    WITH RECURSIVE ancestors(id, parent_id, depth) AS (
      SELECT id, parent_id, 1 FROM folders WHERE id = ?
      UNION ALL
      SELECT f.id, f.parent_id, a.depth + 1
      FROM folders f
      JOIN ancestors a ON f.id = a.parent_id
    )
    SELECT MAX(depth) as depth FROM ancestors;
    `,
    [id],
  );
  return rows[0]?.depth ?? 0;
}

export async function computeSubtreeHeight(id: string): Promise<number> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ relative_depth: number }>(
    `
    WITH RECURSIVE descendants(id, relative_depth) AS (
      SELECT id, 1 FROM folders WHERE id = ?
      UNION ALL
      SELECT f.id, d.relative_depth + 1
      FROM folders f
      JOIN descendants d ON f.parent_id = d.id
    )
    SELECT MAX(relative_depth) as relative_depth FROM descendants;
    `,
    [id],
  );
  return rows[0]?.relative_depth ?? 1;
}

export async function findSelfAndDescendantIds(id: string): Promise<string[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ id: string }>(
    `
    WITH RECURSIVE descendants(id) AS (
      SELECT id FROM folders WHERE id = ?
      UNION ALL
      SELECT f.id FROM folders f JOIN descendants d ON f.parent_id = d.id
    )
    SELECT id FROM descendants;
    `,
    [id],
  );
  return rows.map((r) => r.id);
}

export async function insertFolderRow(row: FolderRow): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    `INSERT INTO folders (id, name, parent_id, sort_order, is_default, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [row.id, row.name, row.parent_id, row.sort_order, row.is_default, row.created_at, row.updated_at],
  );
}

export async function updateFolderNameRow(id: string, name: string, updatedAt: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE folders SET name = ?, updated_at = ? WHERE id = ?;', [name, updatedAt, id]);
}

export async function updateFolderParentRow(
  id: string,
  parentId: string | null,
  sortOrder: number,
  updatedAt: number,
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE folders SET parent_id = ?, sort_order = ?, updated_at = ? WHERE id = ?;', [
    parentId,
    sortOrder,
    updatedAt,
    id,
  ]);
}

export async function updateFolderSortOrderRow(id: string, sortOrder: number, updatedAt: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('UPDATE folders SET sort_order = ?, updated_at = ? WHERE id = ?;', [sortOrder, updatedAt, id]);
}

export async function reassignEntriesFolder(fromFolderIds: string[], toFolderId: string, updatedAt: number): Promise<void> {
  if (fromFolderIds.length === 0) return;
  const db = await getDatabase();
  const placeholders = fromFolderIds.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE entries SET folder_id = ?, updated_at = ? WHERE folder_id IN (${placeholders});`,
    [toFolderId, updatedAt, ...fromFolderIds],
  );
}

export async function deleteEntriesInFolders(folderIds: string[]): Promise<void> {
  if (folderIds.length === 0) return;
  const db = await getDatabase();
  const placeholders = folderIds.map(() => '?').join(', ');
  await db.runAsync(`DELETE FROM entries WHERE folder_id IN (${placeholders});`, folderIds);
}

export async function deleteFolderRow(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM folders WHERE id = ?;', [id]);
}

export async function runInTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const db = await getDatabase();
  let result: T;
  await db.withTransactionAsync(async () => {
    result = await fn();
  });
  // @ts-expect-error — assigned inside the transaction callback above, which always runs before this line.
  return result;
}
