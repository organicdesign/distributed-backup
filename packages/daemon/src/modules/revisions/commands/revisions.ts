import { Revisions } from 'rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides, Requires> = () => ({
  name: Revisions.name,

  async method (): Promise<Revisions.Return> {
    /* const params = Revisions.Params.parse(raw)
    const revisions: Revisions.Return = []
    const database = groups.groups.get(CID.parse(params.group))

    if (database == null) {
      throw new Error('no such group')
    }

    const fs = new Filesystem(context.pinManager, database)

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

    return revisions */
    throw new Error('not implemented')
  }
})

export default command
