import { extendDatastore } from '@organicdesign/db-utils'
import * as cborg from 'cborg'
import { Key, type Datastore } from 'interface-datastore'
import { sha256 } from 'multiformats/hashes/sha2'
import { compare as uint8ArrayCompare } from 'uint8arrays/compare'
import type { KeyvalueDB, Pair } from '@/interface.js'

// Get the hash data from raw data.
const hashEntry = async (entry: unknown): Promise<Uint8Array> => {
  const data = cborg.encode(entry)
  const digest = await sha256.digest(data)

  return digest.bytes
}

// This class is responsible for keeping track of entries in the database.
export class EntryTracker {
  private readonly datastore: Datastore
  private readonly database: KeyvalueDB

  constructor (database: KeyvalueDB) {
    this.datastore = extendDatastore(database.datastore, 'entry-tracker')
    this.database = database
  }

  async * process (prefix: string = '/'): AsyncGenerator<Pair<string, Uint8Array>> {
    const index = await this.database.store.latest()

    for await (const { key, value } of index.query({ prefix })) {
      const str = key.toString()

      if (await this.validate(str, value)) {
        continue
      }

      yield { key: key.toString(), value }

      await this.put(str, value)
    }
  }

  // Process an entry.
  async put (key: string, entry: unknown): Promise<void> {
    const hash = await hashEntry(entry)

    await this.datastore.put(new Key(key), hash)
  }

  async validate (key: string, entry: unknown): Promise<boolean> {
    const eHash = await this.getHash(key)

    if (eHash == null) {
      return false
    }

    const hash = await hashEntry(entry)

    return uint8ArrayCompare(eHash, hash) === 0
  }

  private async getHash (key: string): Promise<Uint8Array | null> {
    try {
      return await this.datastore.get(new Key(key))
    } catch (error) {
      return null
    }
  }
}
