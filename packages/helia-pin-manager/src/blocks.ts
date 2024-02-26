import * as cborg from 'cborg'
import { Key } from 'interface-datastore'
import { CID } from 'multiformats/cid'
import { z } from 'zod'
import type { Datastore } from 'interface-datastore'

export const Block = z.object({
  size: z.number().int().min(0),
  depth: z.number().int().min(0)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Block = z.infer<typeof Block>

export default class {
  private readonly datastore: Datastore

  constructor (datastore: Datastore) {
    this.datastore = datastore
  }

  async get (pinnedBy: CID, cid: CID): Promise<Block | null> {
    const key = new Key(`/${pinnedBy.toString()}/${cid.toString()}`)

    try {
      const value = await this.datastore.get(key)

      return Block.parse(cborg.decode(value))
    } catch (error) {
      return null
    }
  }

  async put (pinnedBy: CID, cid: CID, block: Block): Promise<void> {
    const key = new Key(`/${pinnedBy.toString()}/${cid.toString()}`)

    await this.datastore.put(key, cborg.encode(block))
  }

  async delete (pinnedBy: CID, cid: CID): Promise<void> {
    const key = new Key(`/${pinnedBy.toString()}/${cid.toString()}`)

    await this.datastore.delete(key)
  }

  async getOrPut (pinnedBy: CID, cid: CID, block: Block): Promise<Block> {
    const data = await this.get(pinnedBy, cid)

    if (data != null) {
      return data
    }

    await this.put(pinnedBy, cid, block)

    return block
  }

  async * all (pinnedBy: CID): AsyncGenerator<Block & { cid: CID, pinnedBy: CID }> {
    const prefix = `/${pinnedBy.toString()}`

    for await (const { key, value } of this.datastore.query({ prefix })) {
      const parts = key.toString().split('/')
      const pinnedBy = CID.parse(parts[1])
      const cid = CID.parse(parts[2])
      const data = Block.parse(cborg.decode(value))

      yield {
        cid,
        pinnedBy,
        ...data
      }
    }
  }
}
