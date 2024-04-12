import { GetState } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ pinManager, rpcServer }) => {
  rpcServer.rpc.addMethod(GetState.name, async (raw: unknown): Promise<GetState.Return> => {
    const params = GetState.Params.parse(raw)

    const cid = CID.parse(params.cid)

    const [status, { blocks, size }] = await Promise.all([
      pinManager.getStatus(cid),
      pinManager.getState(cid, { age: params.age })
    ])

    return {
      status,
      blocks,
      size
    }
  })
}

export default command
