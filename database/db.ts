import * as SQLite from 'expo-sqlite';
import * as FileSystem from 'expo-file-system';
import { DATABASE_NAME } from './constants';
import { MIGRATIONS } from './migrations';
import { DatabaseError } from '@/types/database';

let dbInstance: SQLite.SQLiteDatabase | null = null;
let initPromise: Promise<SQLite.SQLiteDatabase> | null = null;

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  const currentVersion = row?.user_version ?? 0;

  const pending = MIGRATIONS.filter((m) => m.version > currentVersion).sort((a, b) => a.version - b.version);

  for (const migration of pending) {
    try {
      await db.withTransactionAsync(async () => {
        await db.execAsync(migration.sql);
        await db.execAsync(`PRAGMA user_version = ${migration.version};`);
      });
    } catch (err) {
      throw new DatabaseError(
        `Migration ${migration.version} ("${migration.description}") failed: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }
}

async function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  let db: SQLite.SQLiteDatabase;
  try {
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  } catch (err) {
    throw new DatabaseError(`Failed to open database: ${err instanceof Error ? err.message : String(err)}`);
  }

  await db.execAsync('PRAGMA foreign_keys = ON;');
  await db.execAsync('PRAGMA journal_mode = WAL;');

  await runMigrations(db);

  return db;
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;

  if (!initPromise) {
    initPromise = initDatabase().then((db) => {
      dbInstance = db;
      return db;
    });
  }

  return initPromise;
}

export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
    initPromise = null;
  }
}

/**
 * Runs `fn` inside a SQLite transaction using the shared database singleton.
 * Any error thrown inside `fn` rolls back the transaction automatically.
 * Prefer this over calling db.withTransactionAsync directly so callers don't
 * need to import getDatabase themselves.
 */
export async function withTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const db = await getDatabase();
  let result: T;
  await db.withTransactionAsync(async () => {
    result = await fn();
  });
  // @ts-expect-error — result is always assigned inside the callback before this line.
  return result;
}

export async function deleteDatabaseFile(): Promise<void> {
  await closeDatabase();

  const dbPath = `${FileSystem.documentDirectory}SQLite/${DATABASE_NAME}`;
  try {
    const info = await FileSystem.getInfoAsync(dbPath);
    if (info.exists) {
      await FileSystem.deleteAsync(dbPath, { idempotent: true });
    }
  } catch (err) {
    throw new DatabaseError(`Failed to delete database file: ${err instanceof Error ? err.message : String(err)}`);
  }
}
