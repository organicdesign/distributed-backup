import * as dagCbor from '@ipld/dag-cbor'
import { CID } from 'multiformats/cid'
import { List } from 'rpc-interfaces'
import { toString as uint8arrayToString } from 'uint8arrays'
import { EncodedEntry, type LocalEntryData } from '../interface.js'
import { createDataKey } from '../utils.js'
import type { Provides, Requires } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'
import { decodeAny } from '@/utils.js'

const command: RPCCommandConstructor<Provides, Requires> = (context, { groups }) => ({
  name: List.name,

  async method (raw: unknown): Promise<List.Return> {
    const params = List.Params.parse(raw)
    const promises: Array<Promise<List.Return[number]>> = []

    for (const { key: cid, value: database } of groups.groups.all()) {
      if (params.group != null && cid !== params.group) {
        continue
      }

      const index = await database.store.latest()

      for await (const pair of index.query({ prefix: createDataKey(params.path) })) {
        // Ignore null values...
        if (decodeAny(pair.value) == null) {
          continue
        }

        const entry = EncodedEntry.optional().parse(dagCbor.decode(pair.value))

        if (entry == null) {
          continue
        }

        const item = CID.decode(entry.cid)

        let ref: Partial<LocalEntryData> | null = null

        if (pair.key.toString().startsWith('/r')) {
          ref = await context.localSettings.get(CID.parse(cid), pair.key.toString().slice(2))
        }

        promises.push((async () => {
          return {
            path: pair.key.toString(),
            cid: item.toString(),
            name: item.toString().slice(0, 8),
            group: cid,
            groupName: database.manifest.name,
            encrypted: entry.encrypted,
            size: entry.size,
            blocks: entry.blocks,
            priority: ref?.priority ?? entry.priority,
            revisionStrategy: ref?.revisionStrategy ?? entry.revisionStrategy,
            timestamp: entry.timestamp,
            author: uint8arrayToString(entry.author, 'base58btc')
          }
        })())
      }
    }

    return Promise.all(promises)
  }
})

export default command
