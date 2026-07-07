import { getDatabase } from '@/database';
import { EntryRow } from '@/types/database';

function escapeLikePattern(term: string): string {
  return term.replace(/[%_]/g, (char) => `\\${char}`);
}

export async function searchEntryRows(query: string | null, folderId: string | null): Promise<EntryRow[]> {
  const db = await getDatabase();

  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (query && query.trim().length > 0) {
    const pattern = `%${escapeLikePattern(query.trim())}%`;
    conditions.push(`(
      e.title LIKE ? ESCAPE '\\' COLLATE NOCASE OR
      e.username LIKE ? ESCAPE '\\' COLLATE NOCASE OR
      et.tag LIKE ? ESCAPE '\\' COLLATE NOCASE OR
      f.name LIKE ? ESCAPE '\\' COLLATE NOCASE
    )`);
    params.push(pattern, pattern, pattern, pattern);
  }

  if (folderId) {
    conditions.push('e.folder_id = ?');
    params.push(folderId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const sql = `
    SELECT DISTINCT e.*
    FROM entries e
    LEFT JOIN entry_tags et ON et.entry_id = e.id
    LEFT JOIN folders f ON f.id = e.folder_id
    ${whereClause}
    ORDER BY e.title COLLATE NOCASE ASC;
  `;

  return db.getAllAsync<EntryRow>(sql, params);
}
