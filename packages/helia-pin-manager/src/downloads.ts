import * as cborg from 'cborg'
import { Key } from 'interface-datastore'
import { CID } from 'multiformats/cid'
import { Download, type BlockRef } from './interface.js'
import type { Datastore } from 'interface-datastore'
import type { AbortOptions } from 'interface-store'

export default class {
  private readonly datastore: Datastore

  constructor (datastore: Datastore) {
    this.datastore = datastore
  }

  async get (pinnedBy: CID, cid: CID, options: AbortOptions = {}): Promise<Download | null> {
    const key = new Key(`/${pinnedBy.toString()}/${cid.toString()}`)

    try {
      const value = await this.datastore.get(key, options)

      return Download.parse(cborg.decode(value))
    } catch (error) {
      return null
    }
  }

  async put (pinnedBy: CID, cid: CID, download: Download, options: AbortOptions = {}): Promise<void> {
    const key = new Key(`/${pinnedBy.toString()}/${cid.toString()}`)

    await this.datastore.put(key, cborg.encode(download), options)
  }

  async delete (pinnedBy: CID, cid: CID, options: AbortOptions = {}): Promise<void> {
    const key = new Key(`/${pinnedBy.toString()}/${cid.toString()}`)

    await this.datastore.delete(key, options)
  }

  async getOrPut (pinnedBy: CID, cid: CID, download: Download, options: AbortOptions = {}): Promise<Download> {
    const data = await this.get(cid, pinnedBy, options)

    if (data != null) {
      return data
    }

    await this.put(pinnedBy, cid, download, options)

    return download
  }

  async * all (pinnedBy: CID, options: AbortOptions = {}): AsyncGenerator<Download & BlockRef> {
    const prefix = `/${pinnedBy.toString()}`

    for await (const { key, value } of this.datastore.query({ prefix }, options)) {
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

  async * allByCid (cid: CID, options: AbortOptions = {}): AsyncGenerator<Download & BlockRef> {
    for await (const { key, value } of this.datastore.query({}, options)) {
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
