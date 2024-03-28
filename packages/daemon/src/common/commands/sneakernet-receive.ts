import { SneakernetReveive } from '@organicdesign/db-rpc-interfaces'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ sneakernet, net }) => {
  net.rpc.addMethod(SneakernetReveive.name, async (raw: unknown): Promise<SneakernetReveive.Return> => {
    const params = SneakernetReveive.Params.parse(raw)

    await sneakernet.import(params.path)

    return null
  })
}

export default command
