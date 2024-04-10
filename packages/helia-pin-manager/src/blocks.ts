import * as cborg from 'cborg'
import { Key } from 'interface-datastore'
import { CID } from 'multiformats/cid'
import { Block } from './interface.js'
import type { Datastore } from 'interface-datastore'
import type { AbortOptions } from 'interface-store'

export default class {
  private readonly datastore: Datastore

  constructor (datastore: Datastore) {
    this.datastore = datastore
  }

  async get (pinnedBy: CID, cid: CID, options: AbortOptions = {}): Promise<Block | null> {
    const key = new Key(`/${pinnedBy.toString()}/${cid.toString()}`)

    try {
      const value = await this.datastore.get(key, options)

      return Block.parse(cborg.decode(value))
    } catch (error) {
      return null
    }
  }

  async put (pinnedBy: CID, cid: CID, block: Block, options: AbortOptions = {}): Promise<void> {
    const key = new Key(`/${pinnedBy.toString()}/${cid.toString()}`)

    await this.datastore.put(key, cborg.encode(block), options)
  }

  async delete (pinnedBy: CID, cid: CID, options: AbortOptions = {}): Promise<void> {
    const key = new Key(`/${pinnedBy.toString()}/${cid.toString()}`)

    await this.datastore.delete(key, options)
  }

  async getOrPut (pinnedBy: CID, cid: CID, block: Block, options: AbortOptions = {}): Promise<Block> {
    const data = await this.get(pinnedBy, cid, options)

    if (data != null) {
      return data
    }

    await this.put(pinnedBy, cid, block, options)

    return block
  }

  async * all (pinnedBy: CID, options: AbortOptions = {}): AsyncGenerator<Block & { cid: CID, pinnedBy: CID }> {
    const prefix = `/${pinnedBy.toString()}`

    for await (const { key, value } of this.datastore.query({ prefix }, options)) {
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
