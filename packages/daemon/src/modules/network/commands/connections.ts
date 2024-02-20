import { Connections } from 'rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(Connections.name, async (): Promise<Connections.Return> => {
    return context.libp2p.getConnections().map(c => c.remoteAddr.toString())
  })
}

export default command
