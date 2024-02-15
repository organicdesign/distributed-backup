import * as dagCbor from '@ipld/dag-cbor'
import { CID } from 'multiformats/cid'
import { Revisions } from 'rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import { type RPCCommandConstructor, EncodedEntry } from '@/interface.js'
import { decodeAny, createVersionKey } from '@/utils.js'

const command: RPCCommandConstructor<Provides, Requires> = (_, { network }) => ({
  name: Revisions.name,

  async method (raw: unknown): Promise<Revisions.Return> {
    const params = Revisions.Params.parse(raw)

    const promises: Array<Promise<Revisions.Return[number]>> = []

    const database = network.groups.get(CID.parse(params.group))

    if (database == null) {
      throw new Error('no such group')
    }

    const index = await database.store.latest()

    for await (const pair of index.query({ prefix: createVersionKey(params.path) })) {
      // Ignore null values...
      if (decodeAny(pair.value) == null) {
        continue
      }

      const entry = EncodedEntry.optional().parse(dagCbor.decode(pair.value))

      if (entry == null) {
        continue
      }

      const item = CID.decode(entry.cid)

      const keyParts = pair.key.toString().split('/')
      const sequence = keyParts.pop()
      const author = keyParts.pop()

      if (sequence == null || author == null) {
        throw new Error('corrupted database')
      }

      promises.push((async () => {
        return {
          cid: item.toString(),
          encrypted: entry.encrypted,
          author,
          sequence: Number(sequence),
          timestamp: entry.timestamp,
          size: entry.size,
          blocks: entry.blocks
        }
      })())
    }

    return Promise.all(promises)
  }
})

export default command
