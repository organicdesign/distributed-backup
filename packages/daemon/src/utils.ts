import Path from 'path'
import { fileURLToPath } from 'url'
import * as cborg from 'cborg'
import { defaultDagWalkers } from 'dag-walkers'
import { type Datastore, Key } from 'interface-datastore'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { NamespaceDatastore } from 'namespace-datastore'
import { type Libp2p, EncodedEntry, type Entry, MEMORY_MAGIC, DATA_KEY, VERSION_KEY } from './interface.js'
import type { AbortOptions, PeerId } from '@libp2p/interface'
import type { Helia } from 'helia'
import type { Blockstore } from 'interface-blockstore'

const dagWalkers = defaultDagWalkers()

export const projectPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../../../..')

export const isMemory = (storage?: string): boolean => storage === MEMORY_MAGIC

export const safePin = async (helia: Helia, cid: CID): Promise<void> => {
  if (!await helia.pins.isPinned(cid)) {
    await all(helia.pins.add(cid))
  }
}

export const safeUnpin = async (helia: Helia, cid: CID): Promise<void> => {
  if (await helia.pins.isPinned(cid)) {
    await all(helia.pins.rm(cid))
  }
}

export const safeReplace = async (helia: Helia, oldCid: CID, newCid: CID): Promise<void> => {
  await safePin(helia, newCid)
  await safeUnpin(helia, oldCid)
}

export const extendDatastore = (datastore: Datastore, name: string): NamespaceDatastore => new NamespaceDatastore(datastore, new Key(name))

export const encodeAny = <T = unknown>(data: T): Uint8Array => {
  return cborg.encode(data)
}

export const decodeAny = <T = unknown>(data: Uint8Array): T => {
  return cborg.decode(data)
}

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

export const countPeers = async ({ libp2p }: { libp2p: Libp2p }, cid: CID, options?: { timeout: number }): Promise<number> => {
  let count = 0

  const itr = libp2p.contentRouting.findProviders(cid, {
    signal: AbortSignal.timeout(options?.timeout ?? 3000)
  })

  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of itr) {
      count++
    }
  } catch (error) {
    // Do nothing
  }

  return count
}

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
