import { Connections } from 'rpc-interfaces'
import type { RPCCommand } from '@/interface.js'
import type { Libp2p } from 'libp2p'

export interface Components {
  libp2p: Libp2p
}

const command: RPCCommand<Components> = {
  name: Connections.name,

  method: (components: Components) => async (): Promise<Connections.Return> => {
    return components.libp2p.getConnections().map(c => c.remoteAddr.toString())
  }
}

export default command
