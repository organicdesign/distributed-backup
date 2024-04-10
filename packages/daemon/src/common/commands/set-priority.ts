import Path from 'path'
import { SetPriority } from '@organicdesign/db-rpc-interfaces'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ rpcServer, pinManager }) => {
  rpcServer.rpc.addMethod(SetPriority.name, async (raw: unknown): Promise<SetPriority.Return> => {
    const params = SetPriority.Params.parse(raw)
    const key = Path.join('/', params.group, params.path)
    const pinInfo = await pinManager.get(key)

    if (pinInfo == null) {
      throw new Error('no such pin')
    }

    pinInfo.priority = params.priority

    await pinManager.put(key, pinInfo)

    return null
  })
}

export default command
