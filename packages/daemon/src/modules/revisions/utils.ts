import Path from 'path'
import { CID } from 'multiformats/cid'
import { fromString as uint8arrayFromString } from 'uint8arrays/from-string'
import { toString as uint8arrayToString } from 'uint8arrays/to-string'
import { VERSION_KEY, EncodedEntry, type Entry } from './interface.js'

export const encodeEntry = (entry: Entry): NonNullable<EncodedEntry> => {
  const ee: NonNullable<EncodedEntry> = {
    ...entry,
    cid: entry.cid.bytes
  }

  // Parse will strip foreign keys...
  return EncodedEntry.parse(ee)!
}

export const decodeEntry = (entry: NonNullable<EncodedEntry>): Entry => ({
  ...entry,
  cid: CID.decode(entry.cid)
})

export const decodeKey = (key: string): { path: string, sequence: number, author: Uint8Array } => {
  if (key.startsWith(`/${VERSION_KEY}/`)) {
    key = key.replace(`/${VERSION_KEY}/`, '/')
  }

  const parts = key.split('/')

  const sequence = parts.pop()
  const author = parts.pop()
  const path = parts.join('/')

  if (sequence == null || author == null) {
    throw new Error('corrupted database')
  }

  return {
    sequence: Number(sequence),
    author: uint8arrayFromString(author, 'base58btc'),
    path
  }
}

export const pathToKey = (path: string, author?: Uint8Array, sequence?: number): string => {
  let key = Path.join('/', VERSION_KEY, path)

  if (author != null) {
    key = Path.join(key, uint8arrayToString(author, 'base58btc'))

    if (sequence != null) {
      key = Path.join(key, sequence.toString())
    }
  }

  return key
}
