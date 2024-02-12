import { type Addresses } from 'rpc-interfaces'
import type { Components } from '../interface.js'

export const name = 'addresses'

export const method = (components: Components) => async (): Promise<Addresses.Return> => {
  return components.libp2p.getMultiaddrs().map(a => a.toString())
}
