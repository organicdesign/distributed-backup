import { Connections } from 'rpc-interfaces'
import type { Provides } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides> = (context) => ({
  name: Connections.name,

  async method (): Promise<Connections.Return> {
    return context.libp2p.getConnections().map(c => c.remoteAddr.toString())
  }
})

export default command
