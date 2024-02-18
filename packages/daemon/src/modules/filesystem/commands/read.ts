import { unixfs } from '@helia/unixfs'
import { CID } from 'multiformats/cid'
import { Read } from 'rpc-interfaces'
import { collect } from 'streaming-iterables'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { createDataKey } from '../utils.js'
import type { Provides, Requires } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides, Requires> = (context, { network }) => ({
  name: Read.name,

  async method (raw: unknown): Promise<Read.Return> {
    const params = Read.Params.parse(raw)
    const fs = context.getFileSystem(CID.parse(params.group))

    if (fs == null) {
      throw new Error('no such group')
    }

    const key = createDataKey(params.path)
    const entry = await fs.get(key)

    if (entry == null) {
      throw new Error(`no such item: ${key}`)
    }

    const ufs = unixfs(network.helia)

    return uint8ArrayToString(uint8ArrayConcat(await collect(ufs.cat(entry.cid, { offset: params.position, length: params.length }))))
  }
})

export default command
