import { z } from 'zod'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const Params = z.object({
  priority: z.number().int().min(1).max(100),
  path: z.string()
})

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod('set-priority', async (raw: unknown) => {
    const params = Params.parse(raw)
    const pinInfo = await context.pinManager.get(params.path)

    if (pinInfo == null) {
      throw new Error('no such pin')
    }

    pinInfo.priority = params.priority

    await context.pinManager.put(params.path, pinInfo)

    return null
  })
}

export default command
