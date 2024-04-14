import { gossipsub } from '@chainsafe/libp2p-gossipsub'
import { noise } from '@chainsafe/libp2p-noise'
import { yamux } from '@chainsafe/libp2p-yamux'
import { identify } from '@libp2p/identify'
import { kadDHT, removePrivateAddressesMapper, removePublicAddressesMapper } from '@libp2p/kad-dht'
import { tcp } from '@libp2p/tcp'
import { createLibp2p } from 'libp2p'
import type { Libp2p } from '@libp2p/interface'
import type { Datastore } from 'interface-datastore'

export default async (datastore?: Datastore): Promise<Libp2p> => {
  return createLibp2p({
    datastore,
    transports: [tcp()],
    connectionEncryption: [noise()],
    streamMuxers: [yamux()],

    addresses: {
      listen: ['/ip4/127.0.0.1/tcp/0']
    },

    services: {
      identify: identify(),
      pubsub: gossipsub({ allowPublishToZeroTopicPeers: true }),

      dht: kadDHT({
        protocol: '/ipfs/kad/1.0.0',
        peerInfoMapper: removePrivateAddressesMapper
      }),

      lanDHT: kadDHT({
        protocol: '/ipfs/lan/kad/1.0.0',
        peerInfoMapper: removePublicAddressesMapper,
        clientMode: false
      })
    }
  })
}
