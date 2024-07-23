import assert from 'assert/strict'
import { type Entry, EncodedEntry } from './interface.js'

export const encodeEntry = (entry: Entry): NonNullable<EncodedEntry> => {
  // Parse will strip foreign keys...
  const stripped = EncodedEntry.parse(entry)

  assert(stripped != null)

  return stripped
}

export const decodeEntry = (encodedEntry: NonNullable<EncodedEntry>): Entry => ({
  ...encodedEntry
})
