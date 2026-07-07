# Changelog

All notable changes to the Kagi Password Vault project will be documented in this file.

## [1.13.0] - 2026-07-07

### Added
- **Import / Restore Service (Feature 12)**: Two-phase, transaction-safe vault restore from `.kagi` backup files:
  - **`services/backup/backupEnvelopeCrypto.ts`** — Added `decryptBackupEnvelope(envelope, backupPassword)`: re-derives keys from the envelope's salt, decrypts the payload blob, maps `IntegrityError` → `WrongBackupPasswordError` for a clean UI error surface, and validates the decrypted JSON before returning.
  - **`services/restore/filePicker.ts`** — `pickBackupFile()`: wraps `expo-document-picker` with `type: '*/*'` and `copyToCacheDirectory: true` for broadest OS compatibility with the custom `.kagi` extension.
  - **`services/restore/backupValidation.ts`** — `validateEnvelopeShape()` (pre-decrypt, checks envelope structure fields) and `validatePayloadShape()` (post-decrypt, checks folders/entries arrays). Both throw descriptive `InvalidBackupFileError` messages. Runs validation in two stages to fail fast before triggering expensive PBKDF2.
  - **`services/restore/restoreQueries.ts`** — `wipeAllVaultData()` (entries first, then folders, respecting the FK RESTRICT); `insertFoldersRespectingHierarchy()` (topological-order insertion with a circular-reference guard + fallback to NULL parent); `insertRestoredEntryRow()` + `insertRestoredEntryTags()`.
  - **`services/restore/restoreService.ts`** — `previewBackup(fileUri, backupPassword)`: read-only — decrypts and validates without touching the vault, returns `BackupPreview` (folder/entry counts + `exportedAt`) for a meaningful confirmation dialog. `restoreFromBackup(payload)`: destructive commit wrapped in a single transaction (rolls back on any failure); re-encrypts all secrets under the current session keys — the backup password's keys never enter the live vault.
  - **`services/restore/index.ts`** — public API barrel.

### Changed
- **`services/backup/backupEnvelopeCrypto.ts`** — `decryptBackupEnvelope` added (symmetric pair to `encryptBackupEnvelope`, co-located as planned).
- **`services/backup/index.ts`** — Re-exports `decryptBackupEnvelope`.

## [1.12.0] - 2026-07-07

### Added
- **Backup / Export Service (Feature 11)**: Full encrypted backup pipeline:
  - **`types/backup.ts`** — `BackupFolder`, `BackupEntry`, `BackupPayload` (plaintext shape before encryption); `BackupEnvelope` (on-disk JSON — only `createdAt`, `salt`, `iterations` are readable, everything else is in the opaque encrypted `payload` blob); `BackupPasswordTooShortError`, `InvalidBackupFileError`, `WrongBackupPasswordError`; `BACKUP_FILE_EXTENSION` (`.kagi`), `BACKUP_FORMAT_VERSION` (`1`).
  - **`services/backup/backupPayloadBuilder.ts`** — `buildBackupPayload()`: fetches all folders + fully-decrypted entries via their respective services (`listFolders`, `listAllEntries`, `getEntry`); no plaintext ever written to disk at this stage.
  - **`services/backup/backupEnvelopeCrypto.ts`** — `encryptBackupEnvelope(payload, backupPassword)`: derives a fresh independent salt + key pair from the backup password (unrelated to the vault master password), serialises the payload to JSON, encrypts the whole thing as a single `EncryptedPayload` blob, wraps in a `BackupEnvelope`. `decryptBackupEnvelope()` is reserved for Feature 12 (Import) so encrypt/decrypt stay co-located.
  - **`services/backup/backupService.ts`** — `exportBackup()` (build → encrypt → write to `documentDirectory`), `shareBackupFile()` (native share sheet via `expo-sharing`, no-ops gracefully if unavailable), `exportAndShareBackup()` (combined, primary UI entry point). Timestamp-stamped file names (`Kagi-Backup-YYYY-MM-DD-HHmmss.kagi`).
  - **`services/backup/index.ts`** — public API barrel; pre-exports all three error classes so Feature 12 needs no barrel changes.

### Changed
- **`services/encryption/index.ts`** — Added four backup-friendly alias exports over existing internals: `generateSalt` (→ `generateSaltHex`), `deriveKeysFromPassword` (→ `deriveKeyPair`), `encryptString` (→ `encrypt`), `decryptString` (→ `decrypt`). No new logic — thin re-exports that give the Backup Service access to raw PBKDF2 machinery without going through the `MasterKeyRecord` flow.

## [1.11.0] - 2026-07-07

### Added
- **Auto-Lock / Session Service (Feature 10)**: Idle-based vault locking with configurable timeout:
  - **`database/migrations.ts`** — Migration v2: adds `app_settings` table (`key TEXT PK`, `value TEXT`) for non-sensitive preferences; never encrypted, intentionally separate from vault data.
  - **`database/settingsStore.ts`** — `getSetting`, `setSetting` (UPSERT), `deleteSetting`; generic key/value accessors for `app_settings`; exported via `@/database` barrel.
  - **`types/autoLock.ts`** — `AutoLockDuration` union (`1 | 5 | 15 | 'never'`), `AUTO_LOCK_OPTIONS` array, `DEFAULT_AUTO_LOCK_DURATION` (5 min), `AUTO_LOCK_SETTING_KEY`.
  - **`services/autoLock/autoLockService.ts`** — `getAutoLockDuration` / `setAutoLockDuration` (persist to `app_settings` with safe `deserialize` fallback to default); `touchActivity()` delegates to `sessionManager.touch()`; `lockNow()` calls `lock()` then `clearClipboardNow()` (Feature 9 hook); `checkAndLockIfIdle()` pull-model check — reads idle time vs. threshold, locks only when threshold exceeded.
  - **`services/autoLock/index.ts`** — public API barrel.
- **Architecture**: Deliberately a **pull model** — no `setTimeout` for the lock trigger. Mobile OSes suspend JS timers when the app is backgrounded; the UI layer will call `checkAndLockIfIdle()` from an `AppState` foreground listener and a short in-foreground interval to reliably catch idle expiry on both iOS and Android.

## [1.10.0] - 2026-07-07

### Added
- **Clipboard Service (Feature 9)**: Secure copy-and-auto-clear clipboard workflow:
  - Created `types/clipboard.ts` — `CLIPBOARD_CLEAR_DELAY_MS` (30 s), `ClipboardEvent` discriminated union (`'copied' | 'cleared'`), `ClipboardEventListener` callback type.
  - Created `services/clipboard/clipboardEvents.ts` — lightweight pub/sub `ClipboardEventEmitter` singleton; UI components (e.g. a global toast host) subscribe without coupling to service internals.
  - Created `services/clipboard/clipboardService.ts` — `copyToClipboard(value, fieldLabel?)` writes to the system clipboard and schedules auto-clear after 30 s; `clearIfStillOurs()` reads the clipboard back and only wipes it if the value still matches what Kagi wrote (backs off if the user copied something else); `clearClipboardNow()` immediate-clear hook for Auto-Lock (Feature 10); `remainingClearMs()` returns milliseconds until the next scheduled clear for countdown UI.
  - Created `services/clipboard/index.ts` — public API barrel.
- **Security**: Ownership check before clearing prevents the service from wiping unrelated clipboard content the user copied in another app between copy and the 30 s timer.

## [1.9.0] - 2026-07-06

### Added
- **Password Generator Service (Feature 8)**: Implemented cryptographically secure password generation:
  - Created `types/passwordGenerator.ts` — `PasswordGeneratorOptions` interface, `DEFAULT_PASSWORD_GENERATOR_OPTIONS` (20 chars, all categories on), `InvalidPasswordLengthError`, `NoCharacterSetSelectedError`.
  - Created `services/passwordGenerator/charsets.ts` — four constant character pools: uppercase (A–Z), lowercase (a–z), numbers (0–9), symbols (`!@#$%^&*()-_=+[]{};:,.<>/?`).
  - Created `services/passwordGenerator/secureRandomInt.ts` — `secureRandomInt(maxExclusive)` using rejection sampling (not modulo) to eliminate bias; `secureShuffle<T>` implementing Fisher-Yates with the same unbiased source.
  - Created `services/passwordGenerator/passwordGeneratorService.ts` — `generatePassword(options)`: validates length (8–64) and charset selection, guarantees ≥1 character from every enabled category, fills remaining slots from the combined pool, then Fisher-Yates shuffles so the guaranteed positions are unpredictable.
  - Created `services/passwordGenerator/index.ts` — public API gate.
- **Security**: Rejection sampling (`Math.floor(256 / max) * max` threshold) ensures uniform distribution across character pools regardless of pool size — a common modulo-bias pitfall avoided.

## [1.8.0] - 2026-07-06

### Added
- **Search & Filter Service (Feature 7)**: Implemented combined search across vault entries:
  - Created `types/search.ts` — `SearchOptions` interface with optional `query`, `folderId`, and `tags` filters.
  - Created `services/search/searchQueries.ts` — single SQL query joining `entries`, `entry_tags`, and `folders` tables; matches free-text against title, username, tag text, and folder name using `LIKE ? ESCAPE '\'` with `COLLATE NOCASE`; LIKE wildcards (`%`, `_`) in user input are escaped to prevent pattern injection.
  - Created `services/search/searchService.ts` — `searchEntries(options)` orchestrates SQL search then applies an in-memory tag-chip filter (exact match, not substring) for any `options.tags` specified; reuses `mapEntryRowToListItem` and `findTagsForEntries` from the Entry Service to avoid duplication.
  - Created `services/search/index.ts` — public API gate.
- **Design**: SQL handles the heavy lifting (indexed columns), tag-chip filtering is a cheap post-filter pass; folder browsing is direct-children only (no recursion into subfolders) per spec.

## [1.7.0] - 2026-07-06

### Added
- **Entry Service (Feature 6)**: Implemented full vault entry management with per-field encryption:
  - Created `types/entry.ts` — `Entry` (fully decrypted), `EntryListItem` (no decryption — safe for list rendering), `CreateEntryInput`, `UpdateEntryInput` DTOs, and `EntryNotFoundError`, `InvalidEntryTitleError` error classes.
  - Created `services/entries/entryMapper.ts` — `FieldCipher` interface; `mapEntryRowToEntry` (async — decrypts all three fields in parallel), `mapEntryRowToListItem` (sync — reads `hasPassword`/`hasKey` presence without decryption), and `encryptNullableField` helper.
  - Created `services/entries/entryQueries.ts` — all raw SQL: single/batch tag fetching (`findTagsForEntries` bulk query avoids N+1), `replaceEntryTags` (delete+insert with dedup), `findAllDistinctTags`, full entry CRUD.
  - Created `services/entries/entryService.ts` — `createEntry`, `getEntry`, `listEntriesByFolder`, `listAllEntries`, `listAllTags`, `updateEntry` (selective field re-encryption), `deleteEntry`, and `reencryptAllEntries` (full vault re-encryption inside a single transaction when master password changes).
  - Created `services/entries/index.ts` — public API gate.
- **Database Layer update**: Added `withTransaction<T>` to `database/db.ts` and re-exported from `database/index.ts` — a shared transaction wrapper so service modules don't need to import `getDatabase` directly.

### Changed
- `database/index.ts` — added `withTransaction` to public exports.

## [1.6.0] - 2026-07-06

### Added
- **Folder Service (Feature 5)**: Implemented complete folder management layer:
  - Created `types/folder.ts` — `Folder`, `FolderWithCount`, `FolderTreeNode` models; `CreateFolderInput`, `RenameFolderInput`, `DeleteFolderStrategy` DTOs; and 5 domain error classes: `FolderNotFoundError`, `InvalidFolderNameError`, `MaxFolderDepthError`, `CircularFolderReferenceError`, `DefaultFolderProtectedError`.
  - Created `services/folders/folderMapper.ts` — pure function mapping snake_case `FolderRow` → camelCase `Folder`.
  - Created `services/folders/folderQueries.ts` — all raw SQL: CRUD operations, recursive CTEs for depth (`WITH RECURSIVE ancestors`) and subtree traversal (`WITH RECURSIVE descendants`), `findSelfAndDescendantIds` for cascading operations, and `runInTransaction` wrapper.
  - Created `services/folders/folderService.ts` — business logic: `createFolder` (depth check on parent), `renameFolder`, `moveFolder` (circular reference + combined depth+height check), `reorderFolders` (transactional bulk sort_order update), `deleteFolder` (`move` or `delete` strategy applied across entire subtree).
  - Created `services/folders/index.ts` — public API gate.
- **Key Behaviours**:
  - `deleteFolder` with `mode: 'move'` bulk-reassigns entries across the entire subtree before a single `DELETE` cascades through child folder rows (`ON DELETE CASCADE`).
  - `moveFolder` checks `newParentDepth + subtreeHeight ≤ MAX_FOLDER_DEPTH` so a folder's deepest existing child is never orphaned beyond 3 levels.
  - `DEFAULT_FOLDER_ID` ("Uncategorized") is protected from deletion and movement; renaming other folders is unrestricted.

## [1.5.0] - 2026-07-06

### Added
- **Database Layer (Feature 4)**: Implemented SQLite persistence using `expo-sqlite`:
  - Created `utils/id.ts` — RFC-4122 v4 UUID generator via `expo-crypto`, used as the primary key strategy for all rows.
  - Created `types/database.ts` — raw SQLite row interfaces (`FolderRow`, `EntryRow`, `EntryTagRow`) mirroring the schema 1:1 in snake_case, plus `DatabaseError`.
  - Created `database/constants.ts` — `DATABASE_NAME`, `DEFAULT_FOLDER_ID / NAME`, `MAX_FOLDER_DEPTH` (3 levels).
  - Created `database/migrations.ts` — versioned `Migration[]` list; v1 creates `folders`, `entries`, `entry_tags` tables with all indexes and seeds the system "Uncategorized" folder. Future schema changes are appended entries only.
  - Created `database/db.ts` — connection singleton (`getDatabase`) with WAL mode, `PRAGMA foreign_keys = ON`, a transactional migration runner keyed on `PRAGMA user_version`, plus `closeDatabase` and `deleteDatabaseFile` helpers for full vault wipe.
  - Created `database/index.ts` — public API re-exporting all DB functions, constants, migration metadata, and types.
- **Schema Design**:
  - Encrypted fields (`password`, `key`, `notes`) stored as per-field `ciphertext + iv + hmac` triplets (Feature 1 scheme); all other columns stay plaintext for fast indexed SQL search.
  - `entry_tags` is a normalized join table — tag search is an indexed SQL query, not an in-memory scan.
  - `folder_id` uses `ON DELETE RESTRICT` forcing the Folder Service (Feature 5) to explicitly reassign/delete entries before removing a folder.
- **Dependencies**: Added `expo-sqlite` (`^14.0.0`) and `expo-file-system` (`^17.0.0`) to `package.json`.

## [1.4.0] - 2026-07-06

### Added
- **Auth Service (Feature 3)**: Implemented full authentication orchestration layer:
  - Created `types/auth.ts` — `PasswordStrengthScore`, `PasswordStrength` interface, and four domain error classes: `VaultAlreadyInitializedError`, `VaultNotInitializedError`, `WrongPasswordError`, `SessionLockedError`.
  - Created `services/auth/passwordPolicy.ts` — Zod schemas (`masterPasswordFieldSchema`, `createMasterPasswordSchema`, `changeMasterPasswordSchema`) and a dependency-free `evaluatePasswordStrength` function producing a 0–4 score with actionable suggestions.
  - Created `services/auth/session.ts` — Singleton `SessionManager` class holding `DerivedKeyPair` in memory only while the vault is unlocked; supports `start`, `end`, `touch`, `idleTimeMs`.
  - Created `services/auth/authService.ts` — High-level functions: `setupMasterPassword`, `login`, `loginWithBiometrics`, `lock`, `logout`, `isUnlocked`, `getSessionCipher`, `enableBiometrics`, `disableBiometrics`, `changeMasterPassword`, `resetVaultCredentials`.
  - Created `services/auth/index.ts` — Public API gate re-exporting all auth functions, types, session manager, and error classes.
- **Dependencies**: Added `zod` (`^3.23.0`) to `package.json`.

## [1.3.0] - 2026-07-04

### Added
- **SecureStore Service (Feature 2)**: Implemented complete credential storage handling via `expo-secure-store`:
  - Created `types/secureStore.ts` defining custom error classes `SecureStoreError` and `BiometricUnavailableError`.
  - Created `services/secureStore/constants.ts` declaring service key IDs, storage keys, and default biometric prompt details.
  - Created `services/secureStore/secureStorage.ts` implementing a thin typed wrapper around raw SecureStore operations.
  - Created `services/secureStore/credentialStore.ts` implementing domain logical layers for saving/loading master password records, tracking biometric toggles, and enabling/disabling/loading biometric-protected derived keys.
  - Created `services/secureStore/index.ts` exporting public credentials storage methods and types.
- **Dependencies**: Added `expo-secure-store` inside dependencies in `package.json`.

## [1.2.0] - 2026-07-04

### Changed
- **PBKDF2 Key Derivation**: Updated `services/encryption/keyDerivation.ts` to use native `react-native-aes-crypto` (`Aes.pbkdf2`) for high-performance key derivation, replacing previous node-crypto PBKDF2.
- **Domain Separation Refactor**: Replaced single-PBKDF2 + HKDF expansion flow with three distinct, domain-separated PBKDF2 runs by appending context labels (`encryption-key`, `mac-key`, `verification-hash`) to the salt.
- **Unified API Adjustment**: Refactored `services/encryption/index.ts` to consume the new `deriveKeyPair` and `deriveVerificationHash` functions.
- **Dependencies**: Added `react-native-aes-crypto` dependency in `package.json`.

## [1.1.0] - 2026-07-04

### Changed
- **Secure Random Generation**: Updated `services/encryption/random.ts` to use `expo-crypto` (`Crypto.getRandomBytesAsync`) for secure random generation, making the library fully compatible with Expo/React Native.
- **Asynchronous Flow**: Refactored `generateSaltHex` and `generateIVHex` to be asynchronous (`Promise<string>`).
- **Encrypt Operations**: Refactored the `encrypt` method in `services/encryption/aes.ts` and `index.ts` to be asynchronous due to async IV generation.
- **Comparison Engine**: Replaced previous timing comparisons with the string-based `constantTimeEqual` function in `random.ts`.
- **Imports & Compiler Configuration**:
  - Configured `@/*` path mapping alias in `tsconfig.json`.
  - Switched internal imports to target the `@/types/encryption` alias path.

## [1.0.0] - 2026-07-04

### Added
- **Project Structure**: Initialized empty layout directories with `.gitkeep` placeholders to preserve folder hierarchies in git:
  - `app/`
  - `components/`
  - `database/`
  - `features/auth/`, `features/folders/`, `features/settings/`, `features/vault/`
  - `hooks/`
  - `theme/`
  - `utils/`
- **Project Configs**: Added root configuration files:
  - `package.json` for managing dependencies and scripts.
  - `tsconfig.json` for TypeScript compilation configurations.
- **Verification Suite**: Created `scratch/test_crypto.ts` in the project directory containing a test suite to verify key derivation, verification hashes, field ciphers, and tampering/integrity check failures.

### Changed
- **Encryption Core Types & Errors**: Implemented standard types in `types/encryption.ts`:
  - Defined interfaces `EncryptedPayload`, `DerivedKeyPair`, and `MasterKeyRecord`.
  - Added specific error classes `IntegrityError` and `EncryptionError`.
  - Updated ciphertext representation to be **Base64 encoded** instead of hex format.
  - Renamed the payload signature property from `mac` to `hmac` for clarity.
- **AES-256-CBC Encrypt-then-MAC Engine**: Refactored the symmetric cipher in `services/encryption/aes.ts`:
  - Updated encryption output and decryption input encoding to support Base64 ciphertext.
  - Updated signature verification to calculate HMAC over `ivHex` + `ciphertextBase64` and map to `hmac` field.
  - Refactored error handling to match the updated error constructors.
- **Cryptographic Constants**: Replaced settings in `services/encryption/constants.ts` with specified parameters:
  - `PBKDF2_ITERATIONS` set to `100,000` (OWASP standard).
  - `KEY_LENGTH_BITS` set to `256` (AES-256 and HMAC-SHA256 both use 256-bit keys).
  - `PBKDF2_HASH_ALGORITHM` set to `'sha256'`.
  - `AES_ALGORITHM` set to `'aes-256-cbc'`.
  - `SALT_LENGTH_BYTES` set to `16` (128 bits).
  - `IV_LENGTH_BYTES` set to `16` (16 bytes AES block size).
  - `KEY_CONTEXT` updated with context separation labels: `kagi:v1:encryption-key`, `kagi:v1:mac-key`, `kagi:v1:verification-hash`.
- **Key Derivation Adjustments**:
  - Refactored `services/encryption/keyDerivation.ts` and `services/encryption/index.ts` to consume the updated constants, using dynamic key length computation (`KEY_LENGTH_BITS / 8`).
  - Switched HKDF digest reference to `PBKDF2_HASH_ALGORITHM` ('sha256').
