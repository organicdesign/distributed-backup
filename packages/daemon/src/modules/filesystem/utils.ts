import Path from 'path'
import { walkDag } from '@organicdesign/db-utils'
import { CID } from 'multiformats/cid'
import { DATA_KEY, EncodedEntry, type Entry } from './interface.js'
import type { Blockstore } from 'interface-blockstore'

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

export const getDagSize = async (blockstore: Blockstore, cid: CID): Promise<{ blocks: number, size: number }> => {
  let size = 0
  let blocks = 0

  for await (const getBlock of walkDag(blockstore, cid)) {
    const { block } = await getBlock()

    blocks++
    size += block.length
  }

  return { size, blocks }
}

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
