import { type ID } from 'rpc-interfaces'
import { toString as uint8ArrayToString } from 'uint8arrays'
import type { RPCCommand } from '@/interface.js'
import type { Welo } from "welo";

export interface Components {
  welo: Welo
}

const command: RPCCommand<Components> = {
  name: 'id',

  method: (components: Components) => async (): Promise<ID.Return> => {
    return uint8ArrayToString(components.welo.identity.id, 'base58btc')
  }
}

export default command
