import Path from 'path'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { encodeEntry } from './utils.js'
import type { Entry, EncodedEntry } from './interface.js'
import type { KeyvalueDB } from '@/interface.js'

export class Schedule {
  private readonly database: KeyvalueDB
  private readonly id: Uint8Array
  private write: number = 0
  private sequence: number = 0

  constructor (database: KeyvalueDB, id: Uint8Array) {
    this.database = database
    this.id = id
  }

  async put (entry: Entry): Promise<void> {
    const encodedEntry: EncodedEntry = encodeEntry(entry)
    const op = this.database.store.creators.put(this.key, encodedEntry)

    await this.database.replica.write(op)
  }

  private get key (): string {
    const write = Date.now()

    if (this.write <= write) {
      this.sequence += 1
    } else {
      this.sequence = 0
      this.write = write
    }

    return Path.join('/', uint8ArrayToString(this.id), `${this.write}`, `${this.sequence}`)
  }
}
