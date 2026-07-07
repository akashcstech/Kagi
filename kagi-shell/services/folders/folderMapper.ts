import { FolderRow } from '@/types/database';
import { Folder } from '@/types/folder';

export function mapFolderRow(row: FolderRow): Folder {
  return {
    id: row.id,
    name: row.name,
    parentId: row.parent_id,
    sortOrder: row.sort_order,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
