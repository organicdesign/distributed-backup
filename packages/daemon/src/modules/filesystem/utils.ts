import { CID } from 'multiformats/cid'
import { EncodedEntry, type Entry } from './interface.js'

export const encodeEntry = (entry: Entry): NonNullable<EncodedEntry> => {
  const ee: NonNullable<EncodedEntry> = {
    ...entry,
    cid: entry.cid.bytes,
    author: entry.author.bytes
  }

  // Parse will strip foreign keys...
  return EncodedEntry.parse(ee) as NonNullable<EncodedEntry>
}

export const decodeEntry = (entry: NonNullable<EncodedEntry>): Entry => ({
  ...entry,
  cid: CID.decode(entry.cid),
  author: CID.decode(entry.author)
})
