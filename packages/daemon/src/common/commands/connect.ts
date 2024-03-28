import { multiaddr } from '@multiformats/multiaddr'
import { Connect } from '@organicdesign/db-rpc-interfaces'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ net, libp2p }) => {
  net.rpc.addMethod(Connect.name, async (raw: unknown): Promise<Connect.Return> => {
    const params = Connect.Params.parse(raw)
    const address = multiaddr(params.address)

    await libp2p.dial(address)

    return null
  })
}

export default command
