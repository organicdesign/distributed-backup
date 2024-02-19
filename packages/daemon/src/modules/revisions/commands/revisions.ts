import { CID } from 'multiformats/cid'
import { Revisions } from 'rpc-interfaces'
import { toString as uint8arrayToString } from 'uint8arrays/to-string'
import type { Provides } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides> = (context) => ({
  name: Revisions.name,

  async method (raw: unknown): Promise<Revisions.Return> {
    const params = Revisions.Params.parse(raw)
    const rs: Revisions.Return = []
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
  }
})

export default command
