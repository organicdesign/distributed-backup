import { Connections } from '@organicdesign/db-rpc-interfaces'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ rpcServer, libp2p }) => {
  rpcServer.rpc.addMethod(Connections.name, async (): Promise<Connections.Return> => {
    return libp2p.getConnections().map(c => c.remoteAddr.toString())
  })
}

export default command
