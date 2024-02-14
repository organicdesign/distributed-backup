import { multiaddr } from '@multiformats/multiaddr'
import { Connect } from 'rpc-interfaces'
import type { RPCCommand } from '@/interface.js'
import type { Libp2p } from "libp2p";

export interface Components {
  libp2p: Libp2p
}

const command: RPCCommand<Components> = {
  name: 'connect',

  method: (components: Components) => async (raw: unknown): Promise<Connect.Return> => {
    const params = Connect.Params.parse(raw)
    const address = multiaddr(params.address)

    await components.libp2p.dial(address)

    return null
  }
}

export default command;
