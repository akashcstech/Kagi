export {
  getFolder,
  listFolders,
  listFolderTree,
  createFolder,
  renameFolder,
  moveFolder,
  reorderFolders,
  deleteFolder,
} from './folderService';

export type {
  Folder,
  FolderWithCount,
  FolderTreeNode,
  CreateFolderInput,
  RenameFolderInput,
  DeleteFolderStrategy,
} from '@/types/folder';

export {
  FolderNotFoundError,
  InvalidFolderNameError,
  MaxFolderDepthError,
  CircularFolderReferenceError,
  DefaultFolderProtectedError,
} from '@/types/folder';
