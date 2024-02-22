import { unixfs } from '@helia/unixfs'
import { Write } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { FileSystemEvent } from '../events.js'
import { getDagSize } from '../utils.js'
import type { Provides, Requires } from '../index.js'
import type { Entry } from '../interface.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc, base, network }) => {
  rpc.addMethod(Write.name, async (raw: unknown): Promise<Write.Return> => {
    const params = Write.Params.parse(raw)
    const group = CID.parse(params.group)
    const fs = context.getFileSystem(CID.parse(params.group))

    if (fs == null) {
      throw new Error('no such group')
    }

    const entry: Partial<Entry> = await fs.get(params.path) ?? {}
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

    await fs.put(params.path, newEntry)

    context.events.dispatchEvent(new FileSystemEvent('file:added', group, params.path, newEntry))

    return params.data.length
  })
}

export default command
