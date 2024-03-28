import { JoinGroup } from '@organicdesign/db-rpc-interfaces'
import { Address } from 'welo'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ net, welo, groups }) => {
  net.rpc.addMethod(JoinGroup.name, async (raw: unknown): Promise<JoinGroup.Return> => {
    const params = JoinGroup.Params.parse(raw)
    const manifest = await welo.fetch(Address.fromString(`/hldb/${params.group}`))

    try {
      await groups.add(manifest)
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
