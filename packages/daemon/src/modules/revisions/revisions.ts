import Path from 'path'
import * as dagCbor from '@ipld/dag-cbor'
import { type Entry, EncodedEntry } from './interface.js'
import { pathToKey, decodeKey, encodeEntry, decodeEntry } from './utils.js'
import { logger } from './index.js'
import type { KeyvalueDB } from '@/interface.js'
import type { PeerId } from '@libp2p/interface'
import type { CID } from 'multiformats/cid'
import { decodeAny } from '@/utils.js'

export class Revisions {
  private readonly database: KeyvalueDB
  private readonly author: Uint8Array

  constructor (database: KeyvalueDB, peerId: PeerId) {
    this.database = database
    this.author = peerId.toBytes()
  }

  get group (): CID {
    return this.database.manifest.address.cid
  }

  async put (path: string, sequence: number, entry: Entry): Promise<void> {
    const key = pathToKey(path, this.author, sequence)

    logger.info(`[+] ${Path.join(this.group.toString(), key)}`)

    const encodedEntry: EncodedEntry = encodeEntry(entry)

    // Update global database.
    const op = this.database.store.creators.put(key, encodedEntry)

    await this.database.replica.write(op)
  }

  async get (path: string, author: Uint8Array, sequence: number): Promise<Entry | null> {
    const key = pathToKey(path, author, sequence)
    const encodedEntry = await this.database.store.selectors.get(this.database.store.index)(key) as EncodedEntry

    if (encodedEntry == null) {
      return null
    }

    return decodeEntry(encodedEntry)
  }

  async delete (path: string, author: Uint8Array, sequence: number): Promise<void> {
    const key = pathToKey(path, author, sequence)

    logger.info(`[-] ${Path.join(this.group.toString(), key)}`)

    const op = this.database.store.creators.del(key)

    await this.database.replica.write(op)
  }

  async * getAll (path: string): AsyncGenerator<{ path: string, entry: Entry, author: Uint8Array, sequence: number }> {
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
      const { path, sequence, author } = decodeKey(pair.key.toString())

      yield {
        path,
        entry,
        sequence,
        author
      }
    }
  }
}
