import { CID } from 'multiformats/cid'
import { Revisions } from 'rpc-interfaces'
import { createVersionKey } from '../utils.js'
import type { Provides } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides> = (context) => ({
  name: Revisions.name,

  async method (raw: unknown): Promise<Revisions.Return> {
    const params = Revisions.Params.parse(raw)
    const revisions: Revisions.Return = []
    const fs = context.getFileSystem(CID.parse(params.group))

    if (fs == null) {
      throw new Error('no such group')
    }

    for await (const pair of fs.getDir(createVersionKey(params.path))) {
      const keyParts = pair.key.toString().split('/')
      const sequence = keyParts.pop()
      const author = keyParts.pop()

      if (sequence == null || author == null) {
        throw new Error('corrupted database')
      }

      revisions.push({
        cid: pair.value.cid.toString(),
        encrypted: pair.value.encrypted,
        author,
        sequence: Number(sequence),
        timestamp: pair.value.timestamp,
        size: pair.value.size,
        blocks: pair.value.blocks
      })
    }

    return revisions
  }
})

export default command
