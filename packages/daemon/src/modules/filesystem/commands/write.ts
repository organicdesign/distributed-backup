import { unixfs } from '@helia/unixfs'
import { CID } from 'multiformats/cid'
import { Write } from 'rpc-interfaces'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { FileSystem } from '../file-system.js'
import { getDagSize, createDataKey } from '../utils.js'
import type { Provides, Requires } from '../index.js'
import type { Entry } from '../interface.js'
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

    const fs = new FileSystem(context.pinManager, database)
    const key = createDataKey(params.path)
    const entry: Partial<Entry> = await fs.get(key) ?? {}
    const ufs = unixfs(network.helia)
    const cid = await ufs.addBytes(uint8ArrayFromString(params.data))
    const { blocks, size } = await getDagSize(base.blockstore, cid)

    const newEntry: Entry = {
      cid,
      author: network.libp2p.peerId.toCID(),
      encrypted: false,
      blocks,
      size,
      timestamp: Date.now(),
      priority: entry?.priority ?? 100,
      sequence: entry?.sequence != null ? entry.sequence + 1 : 0,
      revisionStrategy: entry.revisionStrategy ?? context.config.defaultRevisionStrategy
    }

    await fs.put(key, newEntry, true)

    return params.data.length
  }
})

export default command
