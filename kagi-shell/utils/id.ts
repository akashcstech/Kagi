import * as Crypto from 'expo-crypto';

/** Generates a RFC-4122 v4 UUID for use as a primary key (folders, entries, etc). */
export function generateId(): string {
  return Crypto.randomUUID();
}
