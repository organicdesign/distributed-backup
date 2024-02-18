import Path from 'path'
import { groups as logger } from 'logger'
import { type Entry, type EncodedEntry } from './interface.js'
import { createVersionKey, encodeEntry, decodeEntry } from './utils.js'
import type { KeyvalueDB } from '@/interface.js'
import type { CID } from 'multiformats/cid'

export class Revisions {
  private readonly database: KeyvalueDB

  constructor (database: KeyvalueDB) {
    this.database = database
  }

  get group (): CID {
    return this.database.manifest.address.cid
  }

  async put (path: string, author: Uint8Array, sequence: number, entry: Entry): Promise<void> {
    const key = createVersionKey(path, author, sequence)

    logger(`[+] ${Path.join(this.group.toString(), key)}`)

    const encodedEntry: EncodedEntry = encodeEntry(entry)

    // Update global database.
    const op = this.database.store.creators.put(key, encodedEntry)

    await this.database.replica.write(op)
  }

  async get (path: string, author: Uint8Array, sequence: number): Promise<Entry | null> {
    const key = createVersionKey(path, author, sequence)
    const encodedEntry = await this.database.store.selectors.get(this.database.store.index)(key) as EncodedEntry

    if (encodedEntry == null) {
      return null
    }

    return decodeEntry(encodedEntry)
  }

  async delete (path: string, author: Uint8Array, sequence: number): Promise<void> {
    const key = createVersionKey(path, author, sequence)

    logger(`[-] ${Path.join(this.group.toString(), key)}`)

    const op = this.database.store.creators.del(key)

    await this.database.replica.write(op)
  }
}
