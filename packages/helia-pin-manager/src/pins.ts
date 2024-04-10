import * as cborg from 'cborg'
import { Key } from 'interface-datastore'
import { CID } from 'multiformats/cid'
import { Pin } from './interface.js'
import type { Datastore } from 'interface-datastore'
import type { AbortOptions } from 'interface-store'

export default class {
  private readonly datastore: Datastore

  constructor (datastore: Datastore) {
    this.datastore = datastore
  }

  async get (cid: CID, options: AbortOptions = {}): Promise<Pin | null> {
    const key = new Key(cid.toString())

    try {
      const value = await this.datastore.get(key, options)

      return Pin.parse(cborg.decode(value))
    } catch (error) {
      return null
    }
  }

  async put (cid: CID, pin: Pin, options: AbortOptions = {}): Promise<void> {
    const key = new Key(cid.toString())

    await this.datastore.put(key, cborg.encode(pin), options)
  }

  async delete (cid: CID, options: AbortOptions = {}): Promise<void> {
    const key = new Key(cid.toString())

    await this.datastore.delete(key, options)
  }

  async getOrPut (cid: CID, pin: Pin, options: AbortOptions = {}): Promise<Pin> {
    const data = await this.get(cid, options)

    if (data != null) {
      return data
    }

    await this.put(cid, pin, options)

    return pin
  }

  async * all (options: AbortOptions = {}): AsyncGenerator<Pin & { cid: CID }> {
    for await (const { key, value } of this.datastore.query({}, options)) {
      const cid = CID.parse(key.baseNamespace())
      const data = Pin.parse(cborg.decode(value))

      yield {
        cid,
        ...data
      }
    }
  }
}
