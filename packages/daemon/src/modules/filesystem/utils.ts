import Path from 'path'
import { defaultDagWalkers } from 'dag-walkers'
import { Key } from 'interface-datastore'
import { CID } from 'multiformats/cid'
import { EncodedEntry, type Entry } from './interface.js'
import type { PeerId, AbortOptions } from '@libp2p/interface'
import type { Blockstore } from 'interface-blockstore'
import { DATA_KEY, VERSION_KEY } from '@/interface.js'

const dagWalkers = defaultDagWalkers()

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

export const walkDag = async function * (blockstore: Blockstore, cid: CID, maxDepth?: number, options?: AbortOptions): AsyncGenerator<() => Promise<{ cid: CID, depth: number, block: Uint8Array }>> {
  const queue: Array<() => Promise<{ cid: CID, depth: number, block: Uint8Array }>> = []
  const promises: Array<Promise<{ cid: CID, depth: number, block: Uint8Array }>> = []

  const enqueue = (cid: CID, depth: number): void => {
    queue.push(async () => {
      const promise = Promise.resolve().then(async () => {
        const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code)

        if (dagWalker == null) {
          throw new Error(`No dag walker found for cid codec ${cid.code}`)
        }

        const block = await blockstore.get(cid, options)

        if (maxDepth == null || depth < maxDepth) {
          for await (const cid of dagWalker.walk(block)) {
            enqueue(cid, depth + 1)
          }
        }

        return { cid, depth, block }
      })

      promises.push(promise)

      return promise
    })
  }

  enqueue(cid, 0)

  while (queue.length + promises.length !== 0) {
    const func = queue.shift()

    if (func == null) {
      await promises.shift()

      continue
    }

    yield func
  }
}

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

const toT = <T extends Key | string>(original: T, parsed: string): T extends Key ? Key : string => {
  if (typeof original === 'string') {
    return parsed as T extends Key ? Key : string
  }

  return new Key(parsed) as T extends Key ? Key : string
}

export const stripPrefix = <T extends Key | string = string>(key: T): T extends Key ? Key : string => {
  let str = key.toString()

  if (str.startsWith(`/${DATA_KEY}/`)) {
    str = str.replace(`/${DATA_KEY}/`, '/')
  } else if (str.startsWith(`/${VERSION_KEY}/`)) {
    str = str.replace(`/${VERSION_KEY}/`, '/')
  }

  return toT(key, str)
}

export const prefixKey = <T extends Key | string = string>(key: T, prefix: string): T extends Key ? Key : string => {
  const str = Path.join('/', prefix, key.toString())

  return toT(key, str)
}

export const createDataKey = <T extends Key | string = string>(key: T): T extends Key ? Key : string => {
  return prefixKey(key, DATA_KEY)
}

export const createVersionKey = <T extends Key | string = string>(key: T, peerId?: PeerId, sequence?: number): T extends Key ? Key : string => {
  let str = prefixKey(key, VERSION_KEY).toString()

  if (peerId != null) {
    str = Path.join(str, peerId.toString())
  }

  if (sequence != null) {
    str = Path.join(str, sequence.toString())
  }

  return toT(key, str)
}
