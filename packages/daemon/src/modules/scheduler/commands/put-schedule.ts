import { PutSchedule } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(PutSchedule.name, async (raw: unknown): Promise<PutSchedule.Return> => {
    const params = PutSchedule.Params.parse(raw)
    const group = CID.parse(params.group)
    const schedule = context.getSchedule(group)

    if (schedule == null) {
      throw new Error('no such group')
    }

    return schedule.put({
      from: params.from,
      to: params.to,
      type: params.type,
      context: params.context
    })
  })
}

export default command