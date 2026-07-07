/** SQLite database file name (lives in the app's private sandbox — never synced, never exported directly). */
export const DATABASE_NAME = 'kagi.db';

/**
 * Fixed, well-known id/name for the system "Uncategorized" folder that every
 * entry falls back to when no folder is chosen. This is a structural
 * requirement (spec: "Each entry belongs to exactly one folder"), NOT a
 * sample/demo folder — the user explicitly asked for an otherwise-empty
 * vault on first launch, and this is the only folder created automatically.
 * The Folder Service (Feature 5) should prevent renaming or deleting it.
 */
export const DEFAULT_FOLDER_ID = 'uncategorized';
export const DEFAULT_FOLDER_NAME = 'Uncategorized';

/** Maximum folder nesting depth allowed (spec: up to 3 levels deep). */
export const MAX_FOLDER_DEPTH = 3;
