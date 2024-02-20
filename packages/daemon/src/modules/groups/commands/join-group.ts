import { JoinGroup } from 'rpc-interfaces'
import { Address } from 'welo'
import type { Provides, Requires } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides, Requires> = (context, { rpc }) => {
  rpc.register(JoinGroup.name, async (raw: unknown): Promise<JoinGroup.Return> => {
    const params = JoinGroup.Params.parse(raw)
    const manifest = await context.welo.fetch(Address.fromString(`/hldb/${params.group}`))

    try {
      await context.groups.add(manifest)
    } catch (error) {
      if ((error as Error).message.includes('is already open')) {
        throw new Error('group has already been joined')
      }

      throw error
    }

    return null
  })
}

export default command
