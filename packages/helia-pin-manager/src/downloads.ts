import * as cborg from 'cborg'
import { Key } from 'interface-datastore'
import { CID } from 'multiformats/cid'
import { z } from 'zod'
import type { Datastore } from 'interface-datastore'

export const Download = z.object({
  depth: z.number().int().min(0)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Download = z.infer<typeof Download>

export default class {
  private readonly datastore: Datastore

  constructor (datastore: Datastore) {
    this.datastore = datastore
  }

  async get (pinnedBy: CID, cid: CID): Promise<Download | null> {
    const key = new Key(`/${pinnedBy.toString()}/${cid.toString()}`)

    try {
      const value = await this.datastore.get(key)

      return Download.parse(cborg.decode(value))
    } catch (error) {
      return null
    }
  }

  async put (pinnedBy: CID, cid: CID, download: Download): Promise<void> {
    const key = new Key(`/${pinnedBy.toString()}/${cid.toString()}`)

    await this.datastore.put(key, cborg.encode(download))
  }

  async delete (pinnedBy: CID, cid: CID): Promise<void> {
    const key = new Key(`/${pinnedBy.toString()}/${cid.toString()}`)

    await this.datastore.delete(key)
  }

  async getOrPut (pinnedBy: CID, cid: CID, download: Download): Promise<Download> {
    const data = await this.get(cid, pinnedBy)

    if (data != null) {
      return data
    }

    await this.put(cid, pinnedBy, download)

    return download
  }

  async * all (pinnedBy: CID): AsyncGenerator<Download & { cid: CID, pinnedBy: CID }> {
    const prefix = `/${pinnedBy.toString()}`

    for await (const { key, value } of this.datastore.query({ prefix })) {
      const parts = key.toString().split('/')
      const pinnedBy = CID.parse(parts[1])
      const cid = CID.parse(parts[2])
      const data = Download.parse(cborg.decode(value))

      yield {
        cid,
        pinnedBy,
        ...data
      }
    }
  }

  async * allByCid (cid: CID): AsyncGenerator<Download & { cid: CID, pinnedBy: CID }> {
    for await (const { key, value } of this.datastore.query({})) {
      const parts = key.toString().split('/')
      const thisCid = CID.parse(parts[2])

      if (!cid.equals(thisCid)) {
        continue
      }

      const pinnedBy = CID.parse(parts[1])
      const data = Download.parse(cborg.decode(value))

      yield {
        cid,
        pinnedBy,
        ...data
      }
    }
  }
}
