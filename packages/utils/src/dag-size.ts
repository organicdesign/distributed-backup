import { walkDag } from './dag-walkers/index.js'
import type { Blockstore } from 'interface-blockstore'
import type { CID } from 'multiformats/cid'

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
