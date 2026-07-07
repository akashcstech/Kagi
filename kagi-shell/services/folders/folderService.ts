import { generateId } from '@/utils/id';
import { DEFAULT_FOLDER_ID, MAX_FOLDER_DEPTH } from '@/database';
import { FolderRow } from '@/types/database';
import {
  Folder,
  FolderWithCount,
  FolderTreeNode,
  CreateFolderInput,
  DeleteFolderStrategy,
  FolderNotFoundError,
  InvalidFolderNameError,
  MaxFolderDepthError,
  CircularFolderReferenceError,
  DefaultFolderProtectedError,
} from '@/types/folder';
import { mapFolderRow } from './folderMapper';
import {
  findFolderRowById,
  findAllFolderRows,
  findEntryCountsByFolder,
  findMaxSortOrder,
  computeFolderDepth,
  computeSubtreeHeight,
  findSelfAndDescendantIds,
  insertFolderRow,
  updateFolderNameRow,
  updateFolderParentRow,
  updateFolderSortOrderRow,
  reassignEntriesFolder,
  deleteEntriesInFolders,
  deleteFolderRow,
  runInTransaction,
} from './folderQueries';

function assertValidName(name: string): string {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    throw new InvalidFolderNameError();
  }
  return trimmed;
}

async function requireFolder(id: string): Promise<Folder> {
  const row = await findFolderRowById(id);
  if (!row) throw new FolderNotFoundError(id);
  return mapFolderRow(row);
}

export async function getFolder(id: string): Promise<Folder> {
  return requireFolder(id);
}

export async function listFolders(): Promise<FolderWithCount[]> {
  const [rows, counts] = await Promise.all([findAllFolderRows(), findEntryCountsByFolder()]);
  return rows.map((row) => ({ ...mapFolderRow(row), entryCount: counts[row.id] ?? 0 }));
}

export async function listFolderTree(): Promise<FolderTreeNode[]> {
  const flat = await listFolders();

  const byId = new Map<string, FolderTreeNode>();
  for (const folder of flat) {
    byId.set(folder.id, { ...folder, children: [] });
  }

  const roots: FolderTreeNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId === null) {
      roots.push(node);
    } else {
      const parent = byId.get(node.parentId);
      if (parent) parent.children.push(node);
      else roots.push(node);
    }
  }

  const sortTree = (nodes: FolderTreeNode[]) => {
    nodes.sort((a, b) => a.sortOrder - b.sortOrder);
    nodes.forEach((n) => sortTree(n.children));
  };
  sortTree(roots);

  return roots;
}

export async function createFolder(input: CreateFolderInput): Promise<Folder> {
  const name = assertValidName(input.name);

  if (input.parentId !== null) {
    const parent = await findFolderRowById(input.parentId);
    if (!parent) throw new FolderNotFoundError(input.parentId);

    const parentDepth = await computeFolderDepth(input.parentId);
    if (parentDepth + 1 > MAX_FOLDER_DEPTH) {
      throw new MaxFolderDepthError(MAX_FOLDER_DEPTH);
    }
  }

  const maxSortOrder = await findMaxSortOrder(input.parentId);
  const now = Date.now();

  const row: FolderRow = {
    id: generateId(),
    name,
    parent_id: input.parentId,
    sort_order: (maxSortOrder ?? -1) + 1,
    is_default: 0,
    created_at: now,
    updated_at: now,
  };

  await insertFolderRow(row);
  return mapFolderRow(row);
}

export async function renameFolder(id: string, newName: string): Promise<Folder> {
  const name = assertValidName(newName);
  await requireFolder(id);

  const now = Date.now();
  await updateFolderNameRow(id, name, now);
  return requireFolder(id);
}

export async function moveFolder(id: string, newParentId: string | null): Promise<Folder> {
  await requireFolder(id);

  if (id === DEFAULT_FOLDER_ID) {
    throw new DefaultFolderProtectedError('The "Uncategorized" folder cannot be moved.');
  }

  if (newParentId !== null) {
    if (newParentId === id) {
      throw new CircularFolderReferenceError();
    }

    const descendantIds = await findSelfAndDescendantIds(id);
    if (descendantIds.includes(newParentId)) {
      throw new CircularFolderReferenceError();
    }

    const newParent = await findFolderRowById(newParentId);
    if (!newParent) throw new FolderNotFoundError(newParentId);

    const [newParentDepth, subtreeHeight] = await Promise.all([
      computeFolderDepth(newParentId),
      computeSubtreeHeight(id),
    ]);

    if (newParentDepth + subtreeHeight > MAX_FOLDER_DEPTH) {
      throw new MaxFolderDepthError(MAX_FOLDER_DEPTH);
    }
  }

  const maxSortOrder = await findMaxSortOrder(newParentId);
  const now = Date.now();
  await updateFolderParentRow(id, newParentId, (maxSortOrder ?? -1) + 1, now);

  return requireFolder(id);
}

export async function reorderFolders(parentId: string | null, orderedIds: string[]): Promise<void> {
  const now = Date.now();
  await runInTransaction(async () => {
    for (let index = 0; index < orderedIds.length; index += 1) {
      await updateFolderSortOrderRow(orderedIds[index], index, now);
    }
  });
}

export async function deleteFolder(id: string, strategy: DeleteFolderStrategy): Promise<void> {
  if (id === DEFAULT_FOLDER_ID) {
    throw new DefaultFolderProtectedError();
  }

  await requireFolder(id);

  const affectedFolderIds = await findSelfAndDescendantIds(id);

  if (strategy.mode === 'move') {
    if (affectedFolderIds.includes(strategy.targetFolderId)) {
      throw new CircularFolderReferenceError();
    }
    const targetExists = await findFolderRowById(strategy.targetFolderId);
    if (!targetExists) throw new FolderNotFoundError(strategy.targetFolderId);
  }

  const now = Date.now();

  await runInTransaction(async () => {
    if (strategy.mode === 'move') {
      await reassignEntriesFolder(affectedFolderIds, strategy.targetFolderId, now);
    } else {
      await deleteEntriesInFolders(affectedFolderIds);
    }
    await deleteFolderRow(id);
  });
}
