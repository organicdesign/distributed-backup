import Path from 'path'
import * as dagCbor from '@ipld/dag-cbor'
import { groups as logger } from 'logger'
import { type Entry, EncodedEntry } from './interface.js'
import { encodeEntry, decodeEntry } from './utils.js'
import type { PinManager } from './pin-manager.js'
import type { KeyvalueDB, Pair } from '@/interface.js'
import type { CID } from 'multiformats/cid'
import { decodeAny } from '@/utils.js'

export class Filesystem {
  private readonly database: KeyvalueDB
  private readonly pinManager: PinManager

  constructor (pinManager: PinManager, database: KeyvalueDB) {
    this.database = database
    this.pinManager = pinManager
  }

  get group (): CID {
    return this.database.manifest.address.cid
  }

  async put (path: string, entry: Entry, local: boolean = false): Promise<void> {
    logger(`[+] ${Path.join(this.group.toString(), path)}`)

    const encodedEntry: EncodedEntry = encodeEntry(entry)

    // Update global database.
    const op = this.database.store.creators.put(path, encodedEntry)

    await this.database.replica.write(op)

    await this.pinManager.process(
      this.group,
      path,
      dagCbor.encode(encodedEntry),
      local
    )
  }

  async get (path: string): Promise<Entry | null> {
    const encodedEntry = await this.database.store.selectors.get(this.database.store.index)(path) as EncodedEntry

    if (encodedEntry == null) {
      return null
    }

    return decodeEntry(encodedEntry)
  }

  async delete (path: string): Promise<void> {
    logger(`[-] ${Path.join(this.group.toString(), path)}`)

    const op = this.database.store.creators.del(path)

    await this.database.replica.write(op)
    await this.pinManager.remove(this.group, path)
  }

  async * getDir (path: string): AsyncGenerator<Pair<string, Entry>> {
    const index = await this.database.store.latest()

    for await (const pair of index.query({ prefix: path })) {
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
        key: pair.key.toString(),
        value: entry
      }
    }
  }
}
