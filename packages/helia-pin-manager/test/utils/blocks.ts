import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import type { Helia } from '@helia/interface'
import type { Blockstore } from 'interface-blockstore'

export const hashBlock = async (block: Uint8Array, codec?: number): Promise<CID> => {
  const hash = await sha256.digest(block)

  return CID.createV1(codec ?? raw.code, hash)
}

export const addBlock = async ({ blockstore }: { blockstore: Blockstore }, block: Uint8Array, codec?: number): Promise<CID> => {
  const cid = await hashBlock(block, codec)

  await blockstore.put(cid, block)

  return cid
}

export const createBlocks = async (): Promise<Array<{ block: Uint8Array, cid: CID }>> => {
  const blocks: Array<{ block: Uint8Array, cid: CID }> = []

  for (let i = 0; i < 100; i++) {
    const block = new Uint8Array([i, i, i])
    const cid = await hashBlock(block)

    blocks.push({ block, cid })
  }

  return blocks
}

export const addBlocks = async ({ blockstore }: { blockstore: Blockstore }): Promise<Array<{ block: Uint8Array, cid: CID }>> => {
  const blocks = await createBlocks()

  await Promise.all(blocks.map(async b => addBlock({ blockstore }, b.block)))

  return blocks
}

export const pinBlocks = async (helia: Helia): Promise<void> => {
  const blocks = await addBlocks(helia)

  await Promise.all(blocks.map(({ cid }) => helia.pins.add(cid)))
}
