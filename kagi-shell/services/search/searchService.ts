import { EntryListItem } from '@/types/entry';
import { SearchOptions } from '@/types/search';
import { mapEntryRowToListItem } from '@/services/entries/entryMapper';
import { findTagsForEntries } from '@/services/entries/entryQueries';
import { searchEntryRows } from './searchQueries';

export async function searchEntries(options: SearchOptions = {}): Promise<EntryListItem[]> {
  const rows = await searchEntryRows(options.query ?? null, options.folderId ?? null);

  const tagsByEntry = await findTagsForEntries(rows.map((r) => r.id));
  let items = rows.map((row) => mapEntryRowToListItem(row, tagsByEntry[row.id] ?? []));

  if (options.tags && options.tags.length > 0) {
    const wanted = new Set(options.tags);
    items = items.filter((item) => item.tags.some((tag) => wanted.has(tag)));
  }

  return items;
}
