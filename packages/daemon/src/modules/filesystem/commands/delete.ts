import { CID } from 'multiformats/cid'
import { Delete } from 'rpc-interfaces'
import type { Provides } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides> = (context) => ({
  name: Delete.name,

  method: async (raw: unknown): Promise<Delete.Return> => {
    const params = Delete.Params.parse(raw)
    const pairs = await context.uploads.add('delete', [CID.parse(params.group).bytes, params.path])

    return pairs.map(p => ({ path: p.key, cid: p.value.cid.toString() }))
  }
})

export default command
