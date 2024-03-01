import { SneakernetReveive } from '@organicdesign/db-rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(SneakernetReveive.name, async (raw: unknown): Promise<SneakernetReveive.Return> => {
    const params = SneakernetReveive.Params.parse(raw)

    await context.sneakernet.import(params.path)

    return null
  })
}

export default command
