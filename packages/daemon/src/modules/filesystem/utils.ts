import assert from 'assert/strict'
import Path from 'path'
import { CID } from 'multiformats/cid'
import { DATA_KEY, EncodedEntry, type Entry } from './interface.js'

export const encodeEntry = (entry: Entry): NonNullable<EncodedEntry> => {
  const ee: NonNullable<EncodedEntry> = {
    ...entry,
    cid: entry.cid.bytes
  }

  // Parse will strip foreign keys...
  const stripped = EncodedEntry.parse(ee)

  assert(stripped != null)

  return stripped
}

export const decodeEntry = (entry: NonNullable<EncodedEntry>): Entry => ({
  ...entry,
  cid: CID.decode(entry.cid)
})

export const linearWeightTranslation = (p: number): number => {
  return 1 - p
}

export const logWeightTranslation = (p: number): number => {
  return 1 - Math.log10((10 - 1) * p - 1)
}

export const keyToPath = (key: string): string => {
  let str = key

  if (str.startsWith(`/${DATA_KEY}/`)) {
    str = str.replace(`/${DATA_KEY}/`, '/')
  }

  return str
}

export const pathToKey = (path: string): string => {
  return Path.join('/', DATA_KEY, path)
}
