import Path from 'path'
import * as dagCbor from '@ipld/dag-cbor'
import { groups as logger } from 'logger'
import { type Entry, EncodedEntry } from './interface.js'
import { encodeEntry, decodeEntry, keyToPath, pathToKey } from './utils.js'
import type { KeyvalueDB, Pair } from '@/interface.js'
import type { CID } from 'multiformats/cid'
import { decodeAny } from '@/utils.js'

export class FileSystem {
  private readonly database: KeyvalueDB

  constructor (database: KeyvalueDB) {
    this.database = database
  }

  get group (): CID {
    return this.database.manifest.address.cid
  }

  async put (path: string, entry: Entry): Promise<void> {
    logger(`[+] ${Path.join(this.group.toString(), path)}`)

    const key = pathToKey(path)
    const encodedEntry: EncodedEntry = encodeEntry(entry)

    // Update global database.
    const op = this.database.store.creators.put(key, encodedEntry)

    await this.database.replica.write(op)
  }

  async get (path: string): Promise<Entry | null> {
    const key = pathToKey(path)
    const encodedEntry = await this.database.store.selectors.get(this.database.store.index)(key) as EncodedEntry

    if (encodedEntry == null) {
      return null
    }

    return decodeEntry(encodedEntry)
  }

  async delete (path: string): Promise<void> {
    logger(`[-] ${Path.join(this.group.toString(), path)}`)

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

      yield {
        key: keyToPath(pair.key.toString()),
        value: entry
      }
    }
  }
}
