import { type Entry, EncodedEntry } from './interface.js'

export const encodeEntry = (entry: Entry): NonNullable<EncodedEntry> => {
  // Parse will strip foreign keys...
  return EncodedEntry.parse(entry) as NonNullable<EncodedEntry>
}

export const decodeEntry = (encodedEntry: NonNullable<EncodedEntry>): Entry => ({
  ...encodedEntry
})
