import { type Entry, EncodedEntry } from './interface.js'

export const encodeEntry = (entry: Entry): NonNullable<EncodedEntry> => {
  // Parse will strip foreign keys...
  return EncodedEntry.parse(entry) as NonNullable<EncodedEntry>
}
