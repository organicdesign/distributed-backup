import Path from 'path'
import { zCID } from 'rpc-interfaces/zod'
import { z } from 'zod'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const Params = z.object({
  items: z.array(z.object({
    group: zCID(),
    path: z.string()
  }))
})

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod('set-priority', async (raw: unknown) => {
    const params = Params.parse(raw)

    return Promise.all(params.items.map(async item => {
      const key = Path.join('/', item.group, item.path)
      const pinInfo = await context.pinManager.get(key)

      if (pinInfo == null) {
        throw new Error('no such pin')
      }

      const [state, blocks, size] = await Promise.all([
        context.pinManager.getState(pinInfo.cid),
        context.pinManager.getBlockCount(pinInfo.cid),
        context.pinManager.getSize(pinInfo.cid)
      ])

      return {
        path: item.path,
        group: item.group,
        cid: pinInfo.cid.toString(),
        state,
        blocks,
        size
      }
    }))
  })
}

export default command
