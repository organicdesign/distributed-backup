import { SneakernetSend } from '@organicdesign/db-rpc-interfaces'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ sneakernet, rpcServer }) => {
  rpcServer.rpc.addMethod(SneakernetSend.name, async (raw: unknown): Promise<SneakernetSend.Return> => {
    const params = SneakernetSend.Params.parse(raw)

    await sneakernet.export(params.path, params.peers)

    return null
  })
}

export default command
