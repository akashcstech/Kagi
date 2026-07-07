export interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  sortOrder: number;
  isDefault: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface FolderWithCount extends Folder {
  entryCount: number;
}

export interface FolderTreeNode extends FolderWithCount {
  children: FolderTreeNode[];
}

export interface CreateFolderInput {
  name: string;
  parentId: string | null;
}

export interface RenameFolderInput {
  id: string;
  name: string;
}

export type DeleteFolderStrategy =
  | { mode: 'move'; targetFolderId: string }
  | { mode: 'delete' };

export class FolderNotFoundError extends Error {
  constructor(id: string) {
    super(`Folder "${id}" was not found.`);
    this.name = 'FolderNotFoundError';
  }
}

export class InvalidFolderNameError extends Error {
  constructor(message = 'Folder name cannot be empty.') {
    super(message);
    this.name = 'InvalidFolderNameError';
  }
}

export class MaxFolderDepthError extends Error {
  constructor(maxDepth: number) {
    super(`Folders can be nested at most ${maxDepth} levels deep.`);
    this.name = 'MaxFolderDepthError';
  }
}

export class CircularFolderReferenceError extends Error {
  constructor() {
    super('A folder cannot be moved into itself or one of its own subfolders.');
    this.name = 'CircularFolderReferenceError';
  }
}

export class DefaultFolderProtectedError extends Error {
  constructor(message = 'The "Uncategorized" folder cannot be deleted.') {
    super(message);
    this.name = 'DefaultFolderProtectedError';
  }
}
