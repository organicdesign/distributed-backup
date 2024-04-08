import { defaultDagWalkers } from './walkers.js'
import type { DagWalkResult } from './interface.js'
import type { DAGWalker } from '@helia/interface'
import type { AbortOptions } from '@libp2p/interface'
import type { Blockstore } from 'interface-blockstore'
import type { CID } from 'multiformats/cid'

export * from './interface.js'
export * from './walkers.js'

const dagWalkers = defaultDagWalkers()

export const getWalker = (cid: CID): DAGWalker => {
  const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code)

  if (dagWalker == null) {
    throw new Error(`No dag walker found for cid codec ${cid.code}`)
  }

  return dagWalker
}

export const walk = async function * (blockstore: Blockstore, cid: CID, options: AbortOptions & { local?: boolean, maxDepth?: number } = {}): AsyncGenerator<() => Promise<DagWalkResult>> {
  const queue: Array<() => Promise<DagWalkResult>> = []
  const promises: Array<Promise<DagWalkResult>> = []

  const enqueue = (cid: CID, depth: number): void => {
    queue.push(async () => {
      const promise = Promise.resolve().then(async () => {
        const dagWalker = getWalker(cid)

        if (dagWalker == null) {
          throw new Error(`No dag walker found for cid codec ${cid.code}`)
        }

        if (options.local === true) {
          const has = await blockstore.has(cid, options)

          if (!has) {
            throw new Error(`missing block ${cid.toString()}`)
          }
        }

        const block = await blockstore.get(cid, options)

        if (options.maxDepth == null || depth < options.maxDepth) {
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

export const getSize = async (blockstore: Blockstore, cid: CID): Promise<{ blocks: number, size: number }> => {
  let size = 0
  let blocks = 0

  for await (const getBlock of walk(blockstore, cid)) {
    const data = await getBlock()

    blocks++
    size += data.block.length

    // This is needed to signal to NodeJS to free up the memory imediately,
    // otherwise the memory can hang around for a while and can be massive.
    delete (data as { block?: Uint8Array }).block
  }

  return { size, blocks }
}
