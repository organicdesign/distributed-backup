import * as cborg from 'cborg'
import { Key } from 'interface-datastore'
import { CID } from 'multiformats/cid'
import { z } from 'zod'
import type { Datastore } from 'interface-datastore'

export const Pin = z.object({
  depth: z.number().int().min(0),
  state: z.enum(['COMPLETED', 'DOWNLOADING', 'DESTROYED', 'UPLOADING'])
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Pin = z.infer<typeof Pin>

export default class {
  private readonly datastore: Datastore

  constructor (datastore: Datastore) {
    this.datastore = datastore
  }

  async get (cid: CID): Promise<Pin | null> {
    const key = new Key(cid.toString())

    try {
      const value = await this.datastore.get(key)

      return Pin.parse(cborg.decode(value))
    } catch (error) {
      return null
    }
  }

  async put (cid: CID, pin: Pin): Promise<void> {
    const key = new Key(cid.toString())

    await this.datastore.put(key, cborg.encode(pin))
  }

  async delete (cid: CID): Promise<void> {
    const key = new Key(cid.toString())

    await this.datastore.delete(key)
  }

  async getOrPut (cid: CID, pin: Pin): Promise<Pin> {
    const data = await this.get(cid)

    if (data != null) {
      return data
    }

    await this.put(cid, pin)

    return pin
  }

  async * all (): AsyncGenerator<Pin & { cid: CID }> {
    for await (const { key, value } of this.datastore.query({})) {
      const cid = CID.parse(key.baseNamespace())
      const data = Pin.parse(cborg.decode(value))

      yield {
        cid,
        ...data
      }
    }
  }
}
