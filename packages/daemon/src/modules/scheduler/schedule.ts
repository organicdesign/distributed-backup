import Path from 'path'
import * as dagCbor from '@ipld/dag-cbor'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { type Entry, EncodedEntry, SCHEDULE_KEY } from './interface.js'
import { encodeEntry, decodeEntry } from './utils.js'
import type { KeyvalueDB } from '@/interface.js'
import { decodeAny } from '@/utils.js'

export class Schedule {
  private readonly database: KeyvalueDB
  private readonly id: Uint8Array
  private write: number = 0
  private sequence: number = 0

  constructor (database: KeyvalueDB, id: Uint8Array) {
    this.database = database
    this.id = id
  }

  async put (entry: Entry): Promise<string> {
    const key = this.makeKey()
    const encodedEntry: EncodedEntry = encodeEntry(entry)
    const op = this.database.store.creators.put(key, encodedEntry)

    await this.database.replica.write(op)

    return key
  }

  async get (id: string): Promise<Entry | null> {
    const index = await this.database.store.latest()
    const data = EncodedEntry.parse(this.database.store.selectors.get(index)(id))

    if (data == null) {
      return null
    }

    return decodeEntry(data)
  }

  async update (id: string, context: Record<string, unknown>): Promise<void> {
    const entry = await this.get(id)

    if (entry == null) {
      throw new Error('no such event')
    }

    const encodedEntry: EncodedEntry = encodeEntry({ ...entry, context })
    const op = this.database.store.creators.put(id, encodedEntry)

    await this.database.replica.write(op)
  }

  async * all (): AsyncGenerator<Entry & { id: string }> {
    const index = await this.database.store.latest()

    for await (const pair of index.query({ prefix: Path.join('/', SCHEDULE_KEY) })) {
      // Ignore null values...
      if (decodeAny(pair.value) == null) {
        continue
      }

      const encodedEntry = EncodedEntry.parse(dagCbor.decode(pair.value))

      if (encodedEntry == null) {
        continue
      }

      const entry = decodeEntry(encodedEntry)

      yield { ...entry, id: pair.key.toString() }
    }
  }

  private makeKey (): string {
    const write = Date.now()

    if (this.write <= write) {
      this.sequence += 1
    } else {
      this.sequence = 0
      this.write = write
    }

    return Path.join('/', SCHEDULE_KEY, uint8ArrayToString(this.id), `${this.write}`, `${this.sequence}`)
  }
}