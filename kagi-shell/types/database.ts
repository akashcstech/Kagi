/**
 * Raw row shapes exactly as they come out of SQLite (snake_case columns).
 * Domain/service layers (Feature 5 folders, Feature 6 entries) map these
 * into camelCase app models — this file intentionally stays "dumb" and
 * mirrors the schema 1:1 so migrations are easy to reason about.
 */

export interface FolderRow {
  id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  is_default: 0 | 1;
  created_at: number;
  updated_at: number;
}

export interface EntryRow {
  id: string;
  title: string;
  username: string | null;
  website: string | null;
  folder_id: string;

  password_ciphertext: string | null;
  password_iv: string | null;
  password_hmac: string | null;

  key_ciphertext: string | null;
  key_iv: string | null;
  key_hmac: string | null;

  notes_ciphertext: string | null;
  notes_iv: string | null;
  notes_hmac: string | null;

  created_at: number;
  updated_at: number;
}

export interface EntryTagRow {
  entry_id: string;
  tag: string;
}

export class DatabaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}
