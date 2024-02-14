import type { RPCCommand } from '@/interface.js'
import type { Addresses } from 'rpc-interfaces'
import type { Libp2p } from "libp2p";

export interface Components {
  libp2p: Libp2p
}

const command: RPCCommand<Components> = {
  name: 'addresses',

  method: (components: Components) => async (): Promise<Addresses.Return> => {
    return components.libp2p.getMultiaddrs().map(a => a.toString())
  }
}

export default command;
