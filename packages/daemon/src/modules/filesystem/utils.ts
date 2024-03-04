import Path from 'path'
import { defaultDagWalkers } from '@organicdesign/db-dag-walkers'
import { CID } from 'multiformats/cid'
import { DATA_KEY, EncodedEntry, type Entry } from './interface.js'
import type { AbortOptions } from '@libp2p/interface'
import type { Blockstore } from 'interface-blockstore'

const dagWalkers = defaultDagWalkers()

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
