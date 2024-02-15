import { unixfs } from '@helia/unixfs'
import * as dagCbor from '@ipld/dag-cbor'
import { CID } from 'multiformats/cid'
import { Write } from 'rpc-interfaces'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { decodeEntry, encodeEntry, getDagSize, createDataKey } from '../utils.js'
import type { Provides, Requires } from '../index.js'
import type { EncodedEntry, Entry } from '../interface.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides, Requires> = (context, { base, network, groups }) => ({
  name: Write.name,

  async method (raw: unknown): Promise<Write.Return> {
    const params = Write.Params.parse(raw)
    const group = CID.parse(params.group)
    const database = groups.groups.get(group)

    if (database == null) {
      throw new Error('no such group')
    }

    const key = createDataKey(params.path)
    const encodedEntry = await database.store.selectors.get(database.store.index)(key) as EncodedEntry
    const entry: Partial<Entry> = encodedEntry == null ? {} : decodeEntry(encodedEntry)
    const fs = unixfs(network.helia)
    const cid = await fs.addBytes(uint8ArrayFromString(params.data))
    const { blocks, size } = await getDagSize(base.blockstore, cid)

    const newEncodedEntry = encodeEntry({
      cid,
      author: network.libp2p.peerId.toCID(),
      encrypted: false,
      blocks,
      size,
      timestamp: Date.now(),
      priority: entry?.priority ?? 100,
      sequence: entry?.sequence != null ? entry.sequence + 1 : 0,
      revisionStrategy: entry.revisionStrategy ?? context.config.defaultRevisionStrategy
    })

    const put = database.store.creators.put(key, newEncodedEntry)

    await database.replica.write(put)
    await groups.pinManager.process(group, key, dagCbor.encode(newEncodedEntry), true)

    return params.data.length
  }
})

export default command
