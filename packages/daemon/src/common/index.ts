import Path from 'path'
import { bitswap } from '@helia/block-brokers'
import HeliaPinManager from '@organicdesign/db-helia-pin-manager'
import { createKeyManager } from '@organicdesign/db-key-manager'
import { ManualBlockBroker } from '@organicdesign/db-manual-block-broker'
import { createNetServer } from '@organicdesign/net-rpc'
import { MemoryBlockstore } from 'blockstore-core'
import { FsBlockstore } from 'blockstore-fs'
import { MemoryDatastore } from 'datastore-core'
import { FsDatastore } from 'datastore-fs'
import { createHelia } from 'helia'
import { createWelo, pubsubReplicator, bootstrapReplicator } from 'welo'
import { createDownloader } from './downloader/index.js'
import { EntryTracker } from './entry-tracker.js'
import { createGroups } from './groups.js'
import handleCommands from './handle-commands.js'
import { Config, type Components } from './interface.js'
import createLibp2p from './libp2p.js'
import parseArgv from './parse-argv.js'
import parseConfig from './parse-config.js'
import { PinManager } from './pin-manager/index.js'
import { Sneakernet } from './sneakernet/index.js'
import { createTick } from './tick.js'
import type { KeyvalueDB } from '@/interface.js'
import { createLogger } from '@/logger.js'
import { isMemory, extendDatastore } from '@/utils.js'

export default async (): Promise<Components> => {
  const argv = await parseArgv()
  const logger = createLogger('common')
  const getConfig = await parseConfig(argv.config)
  const keyManager = await createKeyManager(argv.key)
  const net = await createNetServer(argv.socket)
  const config = getConfig(Config)
  const events = new EventTarget()

  const datastore = isMemory(config.storage)
    ? new MemoryDatastore()
    : new FsDatastore(Path.join(config.storage, 'datastore'))

  const blockstore = isMemory(config.storage)
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

  groups.events.addEventListener('groups:joined', ({ cid }) => {
    logger.info(`[groups] [join] ${cid.toString()}`)
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

  heliaPinManager.events.addEventListener('downloads:added', ({ cid }) => {
    logger.info(`[downloads] [+] ${cid}`)
  })

  heliaPinManager.events.addEventListener('pins:added', ({ cid }) => {
    logger.info(`[pins] [+] ${cid}`)
  })

  heliaPinManager.events.addEventListener('pins:adding', ({ cid }) => {
    logger.info(`[pins] [~] ${cid}`)
  })

  heliaPinManager.events.addEventListener('pins:removed', ({ cid }) => {
    logger.info(`[pins] [-] ${cid}`)
  })

  const tick = await createTick(config.tickInterval)

  tick.events.addEventListener('method:error', ({ error }) => {
    logger.error('tick: ', error)
  })

  const pinManager = new PinManager({
    pinManager: heliaPinManager,
    datastore: extendDatastore(datastore, 'pinManager')
  })

  pinManager.events.addEventListener('reference:removed', ({ key }) => {
    logger.info(`[references] [-] ${key}`)
  })

  const downloader = await createDownloader(pinManager, config.slots)

  downloader.events.addEventListener('download:error', ({ error }) => {
    logger.error('downloader: ', error)
  })

  const stop = async () => {
    logger.info('cleaning up...')

    await net.close()
    await tick.stop()
    await downloader.stop()
    await groups.stop()
    await welo.stop()
    await helia.stop()
    await libp2p.stop()

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
    getConfig,
    stop,
    groups,
    pinManager,
    welo,
    heliaPinManager,
    events
  }

  handleCommands(components)

  return components
}
