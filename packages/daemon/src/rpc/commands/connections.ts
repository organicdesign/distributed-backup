import type { Components } from '../../interface.js'

export const name = 'connections'

export const method = (components: Components) => async () => {
  return components.libp2p.getConnections().map(c => c.remoteAddr.toString())
}
