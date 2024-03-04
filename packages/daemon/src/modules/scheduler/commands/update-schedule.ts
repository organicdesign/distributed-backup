import { UpdateSchedule } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(UpdateSchedule.name, async (raw: unknown): Promise<UpdateSchedule.Return> => {
    const params = UpdateSchedule.Params.parse(raw)
    const group = CID.parse(params.group)
    const schedule = context.getSchedule(group)

    if (schedule == null) {
      throw new Error('no such group')
    }

    await schedule.update(params.id, params.context)

    return null
  })
}

export default command
