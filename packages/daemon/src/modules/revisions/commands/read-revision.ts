import { ReadRevision } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import { collect } from 'streaming-iterables'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import type { Context } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Context> = ({ net, unixfs }, context) => {
  net.rpc.addMethod(ReadRevision.name, async (raw: unknown): Promise<ReadRevision.Return> => {
    const params = ReadRevision.Params.parse(raw)
    const group = CID.parse(params.group)
    const revisions = context.getRevisions(group)

    if (revisions == null) {
      throw new Error('no such group')
    }

    const author = uint8ArrayFromString(params.author, 'base58btc')

    const entry = await revisions.get(params.path, author, params.sequence)

    if (entry == null) {
      throw new Error(`no such revision: ${params.path}, ${author}, ${params.sequence}`)
    }

    return uint8ArrayToString(uint8ArrayConcat(await collect(unixfs.cat(entry.cid, { offset: params.position, length: params.length }))))
  })
}

export default command
