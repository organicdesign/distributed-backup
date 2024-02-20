import { multiaddr } from '@multiformats/multiaddr'
import { Connect } from 'rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides, Requires> = (context, { rpc }) => {
  rpc.register(Connect.name, async (raw: unknown): Promise<Connect.Return> => {
    const params = Connect.Params.parse(raw)
    const address = multiaddr(params.address)

    await context.libp2p.dial(address)

    return null
  })
}

export default command
