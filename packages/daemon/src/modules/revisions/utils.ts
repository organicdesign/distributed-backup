import Path from 'path'
import { CID } from 'multiformats/cid'
import { toString as uint8arrayToString } from 'uint8arrays/to-string'
import { VERSION_KEY, EncodedEntry, type Entry } from './interface.js'

export const encodeEntry = (entry: Entry): NonNullable<EncodedEntry> => {
  const ee: NonNullable<EncodedEntry> = {
    ...entry,
    cid: entry.cid.bytes
  }

  // Parse will strip foreign keys...
  return EncodedEntry.parse(ee) as NonNullable<EncodedEntry>
}

export const decodeEntry = (entry: NonNullable<EncodedEntry>): Entry => ({
  ...entry,
  cid: CID.decode(entry.cid)
})

export const createPath = (key: string, author?: Uint8Array, sequence?: number): string => {
  let str = Path.join('/', VERSION_KEY, key)

  if (author != null) {
    str = Path.join(str, uint8arrayToString(author))

    if (sequence != null) {
      str = Path.join(str, sequence.toString())
    }
  }

  return str
}
