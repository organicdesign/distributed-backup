import { Connections } from 'rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides, Requires> = (context, { rpc }) => {
  rpc.register(Connections.name, async (): Promise<Connections.Return> => {
    return context.libp2p.getConnections().map(c => c.remoteAddr.toString())
  })
}

export default command
