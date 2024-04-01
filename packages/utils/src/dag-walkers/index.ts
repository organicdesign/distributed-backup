import { defaultDagWalkers } from './dag-walkers.js'
import type { DAGWalker } from '@helia/interface'
import type { AbortOptions } from '@libp2p/interface'
import type { Blockstore } from 'interface-blockstore'
import type { CID } from 'multiformats/cid'

const dagWalkers = defaultDagWalkers()

export const getDagWalker = (cid: CID): DAGWalker => {
  const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code)

  if (dagWalker == null) {
    throw new Error(`No dag walker found for cid codec ${cid.code}`)
  }

  return dagWalker
}

export interface DagWalkResult {
  cid: CID
  depth: number
  block: Uint8Array
}

export const walkDag = async function * (blockstore: Blockstore, cid: CID, maxDepth?: number, options?: AbortOptions): AsyncGenerator<() => Promise<DagWalkResult>> {
  const queue: Array<() => Promise<DagWalkResult>> = []
  const promises: Array<Promise<DagWalkResult>> = []

  const enqueue = (cid: CID, depth: number): void => {
    queue.push(async () => {
      const promise = Promise.resolve().then(async () => {
        const dagWalker = getDagWalker(cid)

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
