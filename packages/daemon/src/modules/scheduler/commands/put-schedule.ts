import { PutSchedule } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import type { Context } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Context> = ({ rpcServer }, context) => {
  rpcServer.rpc.addMethod(PutSchedule.name, async (raw: unknown): Promise<PutSchedule.Return> => {
    const params = PutSchedule.Params.parse(raw)
    const group = CID.parse(params.group)
    const schedule = context.getSchedule(group)

    if (schedule == null) {
      throw new Error('no such group')
    }

    await schedule.put({
      from: params.from,
      to: params.to,
      type: params.type,
      context: params.context
    })

    return null
  })
}

export default command
