import { Read } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import { collect } from 'streaming-iterables'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { Context } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Context> = ({ rpcServer, unixfs }, context) => {
  rpcServer.rpc.addMethod(Read.name, async (raw: unknown): Promise<Read.Return> => {
    const params = Read.Params.parse(raw)
    const fs = context.getFileSystem(CID.parse(params.group))

    if (fs == null) {
      throw new Error('no such group')
    }

    const entry = await fs.get(params.path)

    if (entry == null) {
      throw new Error(`no such item: ${params.path}`)
    }

    return uint8ArrayToString(uint8ArrayConcat(await collect(unixfs.cat(entry.cid, { offset: params.position, length: params.length }))))
  })
}

export default command
