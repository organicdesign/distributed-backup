import Path from 'path'
import { SetPriority } from 'rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(SetPriority.name, async (raw: unknown): Promise<SetPriority.Return> => {
    const params = SetPriority.Params.parse(raw)
    const key = Path.join('/', params.group, params.path)
    const pinInfo = await context.pinManager.get(key)

    if (pinInfo == null) {
      throw new Error('no such pin')
    }

    pinInfo.priority = params.priority

    await context.pinManager.put(key, pinInfo)

    return null
  })
}

export default command
