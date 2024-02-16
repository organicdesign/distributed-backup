import Path from 'path'
import { groups as logger } from 'logger'
import type { Entry, EncodedEntry } from './interface.js'
import type { KeyvalueDB } from '@/interface.js'

export class Filesystem {
  private readonly database: KeyvalueDB

  constructor (database: KeyvalueDB) {
    this.database = database
  }

  async write (path: string, entry: Entry): Promise<void> {
    logger(`[+] ${Path.join(this.database.manifest.address.cid.toString(), path)}`)

    const rawEntry: EncodedEntry = {
      cid: entry.cid.bytes,
      author: entry.author.bytes,
      encrypted: entry.encrypted,
      timestamp: entry.timestamp,
      sequence: entry.sequence,
      blocks: entry.blocks,
      size: entry.size,
      priority: entry.priority,
      revisionStrategy: entry.revisionStrategy
    }

    // Update global database.
    const op = this.database.store.creators.put(path, rawEntry)

    await this.database.replica.write(op)
  }

  async remove (path: string): Promise<void> {
    logger(`[-] ${Path.join(this.database.manifest.address.cid.toString(), path)}`)

    const op = this.database.store.creators.del(path)

    await this.database.replica.write(op)
  }
}
