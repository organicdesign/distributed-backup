import { GetStatus } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ pinManager, net }) => {
  net.rpc.addMethod(GetStatus.name, async (raw: unknown): Promise<GetStatus.Return> => {
    const params = GetStatus.Params.parse(raw)

    return Promise.all(params.cids.map(async str => {
      const cid = CID.parse(str)

      const [state, blocks, size] = await Promise.all([
        pinManager.getState(cid),
        pinManager.getBlockCount(cid),
        pinManager.getSize(cid)
      ])

      return {
        cid: str,
        state,
        blocks,
        size
      }
    }))
  })
}

export default command
