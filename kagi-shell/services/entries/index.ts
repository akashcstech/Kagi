export {
  createEntry, getEntry, listEntriesByFolder, listAllEntries, listAllTags,
  updateEntry, deleteEntry, reencryptAllEntries,
} from './entryService';

export type { Entry, EntryListItem, CreateEntryInput, UpdateEntryInput } from '@/types/entry';
export { EntryNotFoundError, InvalidEntryTitleError } from '@/types/entry';
