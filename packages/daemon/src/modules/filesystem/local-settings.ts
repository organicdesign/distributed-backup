import * as cborg from 'cborg'
import { Key, type Datastore } from 'interface-datastore'
import { type CID } from 'multiformats/cid'
import { LocalEntryData } from './interface.js'

/**
 * This class handles storing the local settings for entries that overwrite the
 * network ones.
 */
export class LocalSettings {
  private readonly datastore: Datastore

  constructor (components: { datastore: Datastore }) {
    this.datastore = components.datastore
  }

  async set (group: CID, path: string, data: LocalEntryData): Promise<void> {
    const key = new Key(`/${group.toString()}${path}`)

    await this.datastore.put(key, cborg.encode(data))
  }

  async get (group: CID, path: string): Promise<LocalEntryData> {
    const key = new Key(`/${group.toString()}${path}`)

    if (!(await this.datastore.has(key))) {
      return {}
    }

    const raw = await this.datastore.get(key)

    return LocalEntryData.parse(cborg.decode(raw))
  }
}
