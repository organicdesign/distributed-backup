import { multiaddr } from '@multiformats/multiaddr'
import { Connect } from 'rpc-interfaces'
import type { Components } from '../../interface.js'

export const name = 'connect'

export const method = (components: Components) => async (raw: unknown): Promise<Connect.Return> => {
  const params = Connect.Params.parse(raw)
  const address = multiaddr(params.address)

  await components.libp2p.dial(address)

  return null
}
