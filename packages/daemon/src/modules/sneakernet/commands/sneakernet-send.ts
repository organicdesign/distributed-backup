import { SneakernetSend } from '@organicdesign/db-rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(SneakernetSend.name, async (raw: unknown): Promise<SneakernetSend.Return> => {
    const params = SneakernetSend.Params.parse(raw)

    await context.sneakernet.export(params.path, params.peers)

    return null
  })
}

export default command
