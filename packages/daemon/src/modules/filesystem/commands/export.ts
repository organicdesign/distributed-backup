import Path from 'path'
import * as dagCbor from '@ipld/dag-cbor'
import { exportPlaintext } from 'fs-exporter'
import { CID } from 'multiformats/cid'
import { Export } from 'rpc-interfaces'
import type { Requires } from '../index.js'
import { type RPCCommandConstructor, EncodedEntry } from '@/interface.js'
import { decodeEntry, createDataKey } from '@/utils.js'

const command: RPCCommandConstructor<{}, Requires> = (_, { base, network }) => ({
  name: Export.name,

  async method (raw: unknown): Promise<Export.Return> {
    const params = Export.Params.parse(raw)
    const database = network.groups.get(CID.parse(params.group))

    if (database == null) {
      throw new Error('no such group')
    }

    const index = await database.store.latest()

    for await (const pair of index.query({ prefix: createDataKey(params.path) })) {
      const encodedEntry = EncodedEntry.parse(dagCbor.decode(pair.value))

      if (encodedEntry == null) {
        continue
      }

      const entry = decodeEntry(encodedEntry)
      const virtualPath = pair.key.toString().replace('/r', '')

      await exportPlaintext(
        base.blockstore,
        Path.join(params.outPath, virtualPath.replace(params.path, '')),
        entry.cid
      )
    }

    return null
  }
})

export default command
