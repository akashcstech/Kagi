export interface SearchOptions {
  /** Free-text query matched against title, username, tag text, and folder name. */
  query?: string;
  /** Restrict to entries directly inside this folder (not recursive into subfolders). */
  folderId?: string;
  /** Restrict to entries having at least one of these tags. */
  tags?: string[];
}
