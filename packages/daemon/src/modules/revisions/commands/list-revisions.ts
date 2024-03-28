import { ListRevisions } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import { toString as uint8arrayToString } from 'uint8arrays/to-string'
import type { Context } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Context> = ({ net }, context) => {
  net.rpc.addMethod(ListRevisions.name, async (raw: unknown): Promise<ListRevisions.Return> => {
    const params = ListRevisions.Params.parse(raw)
    const rs: ListRevisions.Return = []
    const revisions = context.getRevisions(CID.parse(params.group))

    if (revisions == null) {
      throw new Error('no such group')
    }

    for await (const { sequence, author, entry } of revisions.getAll(params.path)) {
      rs.push({
        cid: entry.cid.toString(),
        encrypted: entry.encrypted,
        author: uint8arrayToString(author, 'base58btc'),
        timestamp: entry.timestamp,
        size: entry.size,
        blocks: entry.blocks,
        sequence
      })
    }

    return rs
  })
}

export default command
