import Path from 'path'
import { zCID } from 'rpc-interfaces/zod'
import { z } from 'zod'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const Params = z.object({
  priority: z.number().int().min(1).max(100),
  group: zCID(),
  path: z.string()
})

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod('set-priority', async (raw: unknown) => {
    const params = Params.parse(raw)
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
