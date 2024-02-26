import { createHelia, type Helia } from 'helia'
import { createLibp2p } from 'libp2p'

export default async (): Promise<Helia> => {
  const libp2p = await createLibp2p({
    addresses: {
      announce: []
    }
  })

  return createHelia({ libp2p })
}
