import { Key, type Datastore } from 'interface-datastore'
import { type CID } from 'multiformats/cid'
import { LocalEntryData } from './interface.js'
import { encodeAny, decodeAny } from './utils.js'

/**
 * This class handles storing the local settings for entries that overwrite the
 * network ones.
 */
export class LocalSettings {
  private readonly datastore: Datastore

  constructor (components: { datastore: Datastore }) {
    this.datastore = components.datastore
  }

  async set (group: CID, path: string, data: Partial<LocalEntryData>): Promise<void> {
    const key = new Key(`/${group.toString()}${path}`)

    await this.datastore.put(key, encodeAny(data))
  }

  async get (group: CID, path: string): Promise<Partial<LocalEntryData> | null> {
    const key = new Key(`/${group.toString()}${path}`)

    if (!(await this.datastore.has(key))) {
      return null
    }

    const raw = await this.datastore.get(key)

    return LocalEntryData.parse(decodeAny(raw))
  }
}
