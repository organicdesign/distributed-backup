import { bitswap } from '@helia/block-brokers'
import PinManager from '@organicdesign/db-helia-pin-manager'
import { ManualBlockBroker } from '@organicdesign/db-manual-block-broker'
import { createHelia } from 'helia'
import createLibp2p from './libp2p.js'
import { type Requires, type Provides, type Config, logger } from './index.js'
import { extendDatastore } from '@/utils.js'

export default async ({ base }: Requires, config: Config): Promise<Provides> => {
  const peerId = await base.keyManager.getPeerId()
  const psk = base.keyManager.getPskKey()

  const libp2p = await createLibp2p({
    datastore: extendDatastore(base.datastore, 'datastore/libp2p'),
    psk: config.private ? psk : undefined,
    peerId,
    ...config
  })

  const manualBlockBroker = new ManualBlockBroker()

  const helia = await createHelia({
    datastore: extendDatastore(base.datastore, 'helia/datastore'),
    libp2p,
    blockstore: base.blockstore,
    blockBrokers: [bitswap(), () => manualBlockBroker]
  })

  const pinManager = new PinManager({
    helia,
    datastore: extendDatastore(base.datastore, 'pinManager')
  })

  pinManager.events.addEventListener('downloads:added', ({ cid }) => {
    logger.info(`[downloads] [+] ${cid}`)
  })

  pinManager.events.addEventListener('pins:added', ({ cid }) => {
    logger.info(`[pins] [+] ${cid}`)
  })

  pinManager.events.addEventListener('pins:adding', ({ cid }) => {
    logger.info(`[pins] [~] ${cid}`)
  })

  pinManager.events.addEventListener('pins:removed', ({ cid }) => {
    logger.info(`[pins] [-] ${cid}`)
  })

  return {
    libp2p,
    helia,
    pinManager,
    config,
    manualBlockBroker
  }
}
