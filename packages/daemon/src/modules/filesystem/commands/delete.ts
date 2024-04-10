import { Delete } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import type { Context } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Context> = ({ rpcServer }, { uploads }) => {
  rpcServer.rpc.addMethod(Delete.name, async (raw: unknown): Promise<Delete.Return> => {
    const params = Delete.Params.parse(raw)
    const pairs = await uploads.add('delete', [CID.parse(params.group).bytes, params.path])

    return pairs.map(p => ({ path: p.key, cid: p.value.cid.toString() }))
  })
}

export default command
