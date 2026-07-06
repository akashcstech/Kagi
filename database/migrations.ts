import { DEFAULT_FOLDER_ID, DEFAULT_FOLDER_NAME } from './constants';

export interface Migration {
  version: number;
  description: string;
  sql: string;
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    description: 'Initial schema: folders, entries, entry_tags + seed default folder.',
    sql: `
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS folders (
        id          TEXT PRIMARY KEY NOT NULL,
        name        TEXT NOT NULL,
        parent_id   TEXT NULL REFERENCES folders(id) ON DELETE CASCADE,
        sort_order  INTEGER NOT NULL DEFAULT 0,
        is_default  INTEGER NOT NULL DEFAULT 0,
        created_at  INTEGER NOT NULL,
        updated_at  INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);

      CREATE TABLE IF NOT EXISTS entries (
        id                  TEXT PRIMARY KEY NOT NULL,
        title               TEXT NOT NULL,
        username            TEXT NULL,
        website             TEXT NULL,
        folder_id           TEXT NOT NULL REFERENCES folders(id) ON DELETE RESTRICT,

        password_ciphertext TEXT NULL,
        password_iv         TEXT NULL,
        password_hmac       TEXT NULL,

        key_ciphertext      TEXT NULL,
        key_iv              TEXT NULL,
        key_hmac            TEXT NULL,

        notes_ciphertext    TEXT NULL,
        notes_iv            TEXT NULL,
        notes_hmac          TEXT NULL,

        created_at          INTEGER NOT NULL,
        updated_at          INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_entries_folder_id ON entries(folder_id);
      CREATE INDEX IF NOT EXISTS idx_entries_title ON entries(title COLLATE NOCASE);
      CREATE INDEX IF NOT EXISTS idx_entries_username ON entries(username COLLATE NOCASE);

      CREATE TABLE IF NOT EXISTS entry_tags (
        entry_id TEXT NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
        tag      TEXT NOT NULL,
        PRIMARY KEY (entry_id, tag)
      );

      CREATE INDEX IF NOT EXISTS idx_entry_tags_tag ON entry_tags(tag COLLATE NOCASE);

      INSERT OR IGNORE INTO folders (id, name, parent_id, sort_order, is_default, created_at, updated_at)
      VALUES ('${DEFAULT_FOLDER_ID}', '${DEFAULT_FOLDER_NAME}', NULL, 0, 1, strftime('%s','now') * 1000, strftime('%s','now') * 1000);
    `,
  },
];

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1].version;
