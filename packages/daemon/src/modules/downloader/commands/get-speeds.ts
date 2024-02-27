import { GetSpeeds } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(GetSpeeds.name, async (raw: unknown): Promise<GetSpeeds.Return> => {
    const params = GetSpeeds.Params.parse(raw)

    return Promise.all(params.cids.map(async str => {
      const cid = CID.parse(str)
      const speed = await context.pinManager.getSpeed(cid)

      return {
        cid: str,
        speed
      }
    }))
  })
}

export default command
