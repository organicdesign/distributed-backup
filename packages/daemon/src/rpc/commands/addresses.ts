import type { Components } from '../../interface.js'

export const name = 'addresses'

export const method = (components: Components) => async () => {
  return components.libp2p.getMultiaddrs().map(a => a.toString())
}
