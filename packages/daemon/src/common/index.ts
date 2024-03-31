import Path from 'path'
import { bitswap } from '@helia/block-brokers'
import HeliaPinManager from '@organicdesign/db-helia-pin-manager'
import { createKeyManager, type KeyManager } from '@organicdesign/db-key-manager'
import { ManualBlockBroker } from '@organicdesign/db-manual-block-broker'
import { createNetServer } from '@organicdesign/net-rpc'
import { MemoryBlockstore } from 'blockstore-core'
import { FsBlockstore } from 'blockstore-fs'
import { MemoryDatastore } from 'datastore-core'
import { FsDatastore } from 'datastore-fs'
import { createHelia } from 'helia'
import { createWelo, pubsubReplicator, bootstrapReplicator } from 'welo'
import { type z } from 'zod'
import { createDownloader } from './downloader/index.js'
import { EntryTracker } from './entry-tracker.js'
import { createGroups } from './groups.js'
import handleCommands from './handle-commands.js'
import handleEvents from './handle-events.js'
import { Config, MEMORY_MAGIC, type Components } from './interface.js'
import createLibp2p from './libp2p.js'
import { PinManager } from './pin-manager/index.js'
import { Sneakernet } from './sneakernet/index.js'
import { createTick } from './tick.js'
import type { KeyvalueDB } from '@/interface.js'
import { createLogger } from '@/logger.js'
import { extendDatastore } from '@organicdesign/db-utils'

interface Setup {
  socket: string
  config: Record<string, unknown>
  key?: string
  keyManager: KeyManager
}

export default async (settings: Partial<Setup> = {}): Promise<Components> => {
  const setup: Pick<Setup, 'socket' | 'config'> = {
    socket: settings.socket ?? '/tmp/server.socket',
    config: settings.config ?? {}
  }

  const logger = createLogger('common')
  const parseConfig = <T extends z.AnyZodObject>(shape: T): z.infer<T> => shape.parse(setup.config)
  const keyManager = settings.keyManager ?? await createKeyManager(settings.key)
  const net = await createNetServer(setup.socket)
  const config = parseConfig(Config)
  const events = new EventTarget()

  const datastore = config.storage === MEMORY_MAGIC
    ? new MemoryDatastore()
    : new FsDatastore(Path.join(config.storage, 'datastore'))

  const blockstore = config.storage === MEMORY_MAGIC
    ? new MemoryBlockstore()
    : new FsBlockstore(Path.join(config.storage, 'blockstore'))

  const peerId = await keyManager.getPeerId()
  const psk = keyManager.getPskKey()

  const libp2p = await createLibp2p({
    datastore: extendDatastore(datastore, 'datastore/libp2p'),
    psk: config.private ? psk : undefined,
    peerId,
    ...config
  })

  const manualBlockBroker = new ManualBlockBroker()

  const helia = await createHelia({
    datastore: extendDatastore(datastore, 'helia/datastore'),
    libp2p,
    blockstore,
    blockBrokers: [bitswap(), () => manualBlockBroker]
  })

  const welo = await createWelo({
    // @ts-expect-error Helia version mismatch here.
    ipfs: helia,
    replicators: [bootstrapReplicator(), pubsubReplicator()],
    identity: await keyManager.getWeloIdentity()
  })

  const groups = await createGroups({
    datastore: extendDatastore(datastore, 'groups'),
    welo
  })

  const sneakernet = new Sneakernet({
    welo,
    helia,
    datastore: extendDatastore(datastore, 'sneakernet'),
    manualBlockBroker,
    groups
  })

  const getTracker = (database: KeyvalueDB): EntryTracker => new EntryTracker(database)

  const heliaPinManager = new HeliaPinManager({
    helia,
    datastore: extendDatastore(datastore, 'heliaPinManager')
  })

  const tick = await createTick(config.tickInterval)

  const pinManager = new PinManager({
    pinManager: heliaPinManager,
    datastore: extendDatastore(datastore, 'pinManager')
  })

  const downloader = await createDownloader(pinManager, config.slots)

  const stop = async (): Promise<void> => {
    logger.info('cleaning up...')

    const closeDatastore = async (): Promise<void> => {
      if (datastore instanceof FsDatastore) {
        await datastore.close()
      }
    }

    const closeBlockstore = async (): Promise<void> => {
      if (blockstore instanceof FsBlockstore) {
        await blockstore.close()
      }
    }

    await Promise.all([
      net.close(),
      tick.stop(),
      downloader.stop(),
      groups.stop(),
      welo.stop(),
      helia.stop(),
      libp2p.stop()
    ])

    await Promise.all([
      closeDatastore,
      closeBlockstore
    ])

    logger.info('exiting...')
  }

  const components: Components = {
    sneakernet,
    getTracker,
    helia,
    libp2p,
    blockstore,
    datastore,
    net,
    tick,
    downloader,
    parseConfig,
    stop,
    groups,
    pinManager,
    welo,
    heliaPinManager,
    events,
    keyManager
  }

  handleCommands(components)
  handleEvents(components, logger)

  return components
}
