import { LATEST_SCHEMA_VERSION } from '@/database';
import { listFolders } from '@/services/folders';
import { listAllEntries, getEntry } from '@/services/entries';
import { BackupPayload, BackupFolder, BackupEntry } from '@/types/backup';

export async function buildBackupPayload(): Promise<BackupPayload> {
  const [folderRows, entryListItems] = await Promise.all([listFolders(), listAllEntries()]);

  const folders: BackupFolder[] = folderRows.map((f) => ({
    id: f.id,
    name: f.name,
    parentId: f.parentId,
    sortOrder: f.sortOrder,
    isDefault: f.isDefault,
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  }));

  const entries: BackupEntry[] = [];
  for (const item of entryListItems) {
    const full = await getEntry(item.id);
    entries.push({
      id: full.id,
      title: full.title,
      username: full.username,
      website: full.website,
      folderId: full.folderId,
      tags: full.tags,
      password: full.password,
      key: full.key,
      notes: full.notes,
      createdAt: full.createdAt,
      updatedAt: full.updatedAt,
    });
  }

  return {
    schemaVersion: LATEST_SCHEMA_VERSION,
    exportedAt: Date.now(),
    folders,
    entries,
  };
}
