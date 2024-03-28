import { Connections } from '@organicdesign/db-rpc-interfaces'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ net, libp2p }) => {
  net.rpc.addMethod(Connections.name, async (): Promise<Connections.Return> => {
    return libp2p.getConnections().map(c => c.remoteAddr.toString())
  })
}

export default command
