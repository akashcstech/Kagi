export interface Entry {
  id: string;
  title: string;
  username: string | null;
  website: string | null;
  folderId: string;
  tags: string[];
  password: string | null;
  key: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface EntryListItem {
  id: string;
  title: string;
  username: string | null;
  folderId: string;
  tags: string[];
  hasPassword: boolean;
  hasKey: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface CreateEntryInput {
  title: string;
  username?: string | null;
  website?: string | null;
  folderId?: string | null;
  tags?: string[];
  password?: string | null;
  key?: string | null;
  notes?: string | null;
}

export interface UpdateEntryInput {
  title?: string;
  username?: string | null;
  website?: string | null;
  folderId?: string;
  tags?: string[];
  password?: string | null;
  key?: string | null;
  notes?: string | null;
}

export class EntryNotFoundError extends Error {
  constructor(id: string) {
    super(`Entry "${id}" was not found.`);
    this.name = 'EntryNotFoundError';
  }
}

export class InvalidEntryTitleError extends Error {
  constructor(message = 'Entry title cannot be empty.') {
    super(message);
    this.name = 'InvalidEntryTitleError';
  }
}
