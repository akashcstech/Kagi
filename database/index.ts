export { getDatabase, closeDatabase, withTransaction, deleteDatabaseFile } from './db';
export { DEFAULT_FOLDER_ID, DEFAULT_FOLDER_NAME, MAX_FOLDER_DEPTH, DATABASE_NAME } from './constants';
export { LATEST_SCHEMA_VERSION } from './migrations';
export type { Migration } from './migrations';

export type { FolderRow, EntryRow, EntryTagRow } from '@/types/database';
export { DatabaseError } from '@/types/database';
