import Path from 'path'
import { bitswap } from '@helia/block-brokers'
import HeliaPinManager from '@organicdesign/db-helia-pin-manager'
import { createKeyManager } from '@organicdesign/db-key-manager'
import { ManualBlockBroker } from '@organicdesign/db-manual-block-broker'
import { MemoryBlockstore } from 'blockstore-core'
import { FsBlockstore } from 'blockstore-fs'
import { MemoryDatastore } from 'datastore-core'
import { FsDatastore } from 'datastore-fs'
import { createHelia } from 'helia'
import { createWelo, pubsubReplicator, bootstrapReplicator } from 'welo'
import { createDownloader } from './downloader/index.js'
import { EntryTracker } from './entry-tracker.js'
import { createGroups } from './groups.js'
import { Config } from './interface.js'
import createLibp2p from './libp2p.js'
import parseArgv from './parse-argv.js'
import parseConfig from './parse-config.js'
import { PinManager } from './pin-manager/index.js'
import { Sneakernet } from './sneakernet/index.js'
import { createTick } from './tick.js'
import type { KeyvalueDB } from '@/interface.js'
import { createLogger } from '@/logger.js'
import { isMemory, extendDatastore } from '@/utils.js'

export default async () => {
  const argv = await parseArgv()
  const logger = createLogger('common')
  const getConfig = await parseConfig(argv.socket)
  const keyManager = await createKeyManager(argv.key)
  const controller = new AbortController()

  const config = getConfig(Config)

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
    ipfs: network.helia,
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
    datastore: extendDatastore(datastore, 'pinManager')
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
    datastore
  })

  pinManager.events.addEventListener('reference:removed', ({ key }) => {
    logger.info(`[references] [-] ${key}`)
  })

  const downloader = await createDownloader(pinManager, config.slots)

  downloader.events.addEventListener('download:error', ({ error }) => {
    logger.error('downloader: ', error)
  })

  controller.signal.addEventListener('abort', () => {
    (async () => {
      await tick.stop()
      await downloader.stop()
      await groups.stop()
      await welo.stop()
      await helia.stop()
      await libp2p.stop()
    })().catch(error => {
      logger.error(error)
    })
  })

  return {
    sneakernet,
    getTracker
  }
}
