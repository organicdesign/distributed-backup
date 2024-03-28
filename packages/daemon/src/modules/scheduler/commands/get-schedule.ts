import { GetSchedule } from '@organicdesign/db-rpc-interfaces'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import type { Context } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Context> = ({ net }, context) => {
  net.rpc.addMethod(GetSchedule.name, async (raw: unknown): Promise<GetSchedule.Return> => {
    const params = GetSchedule.Params.parse(raw)
    const group = CID.parse(params.group)
    const schedule = context.getSchedule(group)

    if (schedule == null) {
      throw new Error('no such group')
    }

    const data = await all(schedule.all())

    return data
  })
}

export default command
