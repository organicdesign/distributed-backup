import Path from 'path'
import * as dagCbor from '@ipld/dag-cbor'
import { type Entry, EncodedEntry } from './interface.js'
import { encodeEntry, decodeEntry, keyToPath, pathToKey, getDagSize } from './utils.js'
import { logger } from './index.js'
import type { LocalSettings } from './local-settings.js'
import type { KeyvalueDB, Pair } from '@/interface.js'
import type { Blockstore } from 'interface-blockstore'
import type { CID } from 'multiformats/cid'
import { decodeAny } from '@/utils.js'

export class FileSystem {
  private readonly database: KeyvalueDB
  private readonly blockstore: Blockstore
  private readonly id: Uint8Array
  private readonly localSettings: LocalSettings

  constructor ({ database, blockstore, id, localSettings }: { database: KeyvalueDB, blockstore: Blockstore, id: Uint8Array, localSettings: LocalSettings }) {
    this.database = database
    this.blockstore = blockstore
    this.id = id
    this.localSettings = localSettings
  }

  get group (): CID {
    return this.database.manifest.address.cid
  }

  async put (path: string, entry: Pick<Entry, 'cid' | 'encrypted' | 'revisionStrategy' | 'priority'>): Promise<Entry> {
    logger.info(`[groups] [+] ${Path.join(this.group.toString(), path)}`)

    const { blocks, size } = await getDagSize(this.blockstore, entry.cid)

    const existing = await this.get(path)
    let sequence = 0

    if (existing != null) {
      sequence = existing.sequence + 1
    }

    const fullEntry = {
      ...entry,
      blocks,
      size,
      sequence,
      author: this.id,
      timestamp: Date.now()
    }

    const key = pathToKey(path)
    const encodedEntry: EncodedEntry = encodeEntry(fullEntry)

    // Update global database.
    const op = this.database.store.creators.put(key, encodedEntry)

    await this.database.replica.write(op)

    return fullEntry
  }

  async get (path: string): Promise<Entry | null> {
    const key = pathToKey(path)
    const index = await this.database.store.latest()
    const encodedEntry = await this.database.store.selectors.get(index)(key) as EncodedEntry

    if (encodedEntry == null) {
      return null
    }

    const entry = decodeEntry(encodedEntry)
    const localSettings = await this.localSettings.get(this.group, path)

    return { ...entry, ...localSettings }
  }

  async delete (path: string): Promise<void> {
    logger.info(`[groups] [-] ${Path.join(this.group.toString(), path)}`)

    const key = pathToKey(path)
    const op = this.database.store.creators.del(key)

    await this.database.replica.write(op)
  }

  async * getDir (path: string): AsyncGenerator<Pair<string, Entry>> {
    const index = await this.database.store.latest()
    const key = pathToKey(path)

    for await (const pair of index.query({ prefix: key })) {
      // Ignore null values...
      if (decodeAny(pair.value) == null) {
        continue
      }

      const encodedEntry = EncodedEntry.parse(dagCbor.decode(pair.value))

      if (encodedEntry == null) {
        continue
      }

      const entry = decodeEntry(encodedEntry)
      const localSettings = await this.localSettings.get(this.group, path)

      yield {
        key: keyToPath(pair.key.toString()),
        value: { ...entry, ...localSettings }
      }
    }
  }
}
