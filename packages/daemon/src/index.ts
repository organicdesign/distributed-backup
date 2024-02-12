import fs from 'fs/promises'
import Path from 'path'
import { createNetServer } from '@organicdesign/net-rpc'
import { MemoryBlockstore } from 'blockstore-core'
import { FsBlockstore } from 'blockstore-fs'
import { Cipher } from 'cipher'
import { MemoryDatastore } from 'datastore-core'
import { FsDatastore } from 'datastore-fs'
import { createHelia } from 'helia'
import createHeliaPinManager from 'helia-pin-manager'
import { createKeyManager } from 'key-manager'
import * as logger from 'logger'
import { createWelo, pubsubReplicator, bootstrapReplicator } from 'welo'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import { getConfig } from './config.js'
import { createGroups } from './groups.js'
import createLibp2p from './libp2p.js'
import { LocalSettings } from './local-settings.js'
import { Looper } from './looper.js'
import { syncLoop, downloadLoop } from './loops.js'
import { PinManager } from './pin-manager.js'
import commands from './rpc.js'
import createSyncManager from './sync-operations.js'
import createUploadManager from './upload-operations.js'
import { projectPath, isMemory, extendDatastore } from './utils.js'
import type { Components } from './interface.js'

const argv = await yargs(hideBin(process.argv))
  .option({
    socket: {
      alias: 's',
      type: 'string',
      default: '/tmp/server.socket'
    }
  })
  .option({
    key: {
      alias: 'k',
      type: 'string',
      default: Path.join(projectPath, 'config/key.json')
    }
  })
  .option({
    config: {
      alias: 'c',
      type: 'string',
      default: Path.join(projectPath, 'config/config.json')
    }
  })
  .parse()

logger.lifecycle('starting...')

// Setup all the modules.
const config = await getConfig(argv.config)
logger.lifecycle('loaded config')

// Stops the error thrown by libp2p.
if (!isMemory(config.storage)) {
  await fs.mkdir(Path.join(config.storage, 'datastore/libp2p'), { recursive: true })
}

// Setup datastores and blockstores.
const keyManager = await createKeyManager(Path.resolve(argv.key))

const datastore = isMemory(config.storage)
  ? new MemoryDatastore()
  : new FsDatastore(Path.join(config.storage, 'datastore'))

const blockstore = isMemory(config.storage)
  ? new MemoryBlockstore()
  : new FsBlockstore(Path.join(config.storage, 'blockstore'))

const peerId = await keyManager.getPeerId()
const psk = keyManager.getPskKey()

const libp2pDatastore = isMemory(config.storage)
  ? new MemoryDatastore()
  : new FsDatastore(Path.join(config.storage, 'datastore/libp2p'))

const libp2p = await createLibp2p({
  datastore: libp2pDatastore,
  psk: config.private ? psk : undefined,
  peerId,
  ...config
})

logger.lifecycle('loaded libp2p')

const helia = await createHelia({
  datastore: extendDatastore(datastore, 'helia/datastore'),
  libp2p,
  blockstore
})

logger.lifecycle('loaded helia')

const welo = await createWelo({
  // @ts-expect-error Helia version mismatch here.
  ipfs: helia,
  replicators: [bootstrapReplicator(), pubsubReplicator()],
  identity: await keyManager.getWeloIdentity()
})

logger.lifecycle('loaded welo')

const cipher = new Cipher(keyManager)

logger.lifecycle('loaded cipher')

const localSettings = new LocalSettings({
  datastore: extendDatastore(datastore, 'references')
})

const groups = await createGroups({
  datastore: extendDatastore(datastore, 'groups'),
  welo
})

logger.lifecycle('loaded groups')

const { rpc, close } = await createNetServer(argv.socket)

logger.lifecycle('loaded server')

const heliaPinManager = await createHeliaPinManager(helia, {
  storage: isMemory(config.storage) ? ':memory:' : Path.join(config.storage, 'sqlite')
})

heliaPinManager.events.addEventListener('downloads:added', ({ cid }) => {
  logger.downloads(`[+] ${cid}`)
})

heliaPinManager.events.addEventListener('pins:added', ({ cid }) => {
  logger.pins(`[+] ${cid}`)
})

heliaPinManager.events.addEventListener('pins:adding', ({ cid }) => {
  logger.pins(`[~] ${cid}`)
})

heliaPinManager.events.addEventListener('pins:removed', ({ cid }) => {
  logger.pins(`[-] ${cid}`)
})

const pinManager = new PinManager({
  pinManager: heliaPinManager,
  datastore: extendDatastore(datastore, 'pin-references')
})

const sync = await createSyncManager({
  datastore: extendDatastore(datastore, 'sync-operations'),
  pinManager,
  groups
})

logger.lifecycle('downloads synced')

const uploads = await createUploadManager({
  datastore: extendDatastore(datastore, 'upload-operations'),
  libp2p,
  groups,
  pinManager,
  blockstore,
  helia
})

logger.lifecycle('uploads synced')

const components: Components = {
  libp2p,
  cipher,
  helia,
  welo,
  blockstore,
  groups,
  config,
  pinManager,
  uploads,
  sync,
  localSettings
}

// Register all the RPC commands.
for (const command of commands) {
  rpc.addMethod(command.name, command.method(components))
}

// Cleanup on signal interupt.
let exiting = false

process.on('SIGINT', () => {
  if (exiting) {
    logger.lifecycle('force exiting')
    process.exit(1)
  }

  exiting = true

  ;(async () => {
    logger.lifecycle('cleaning up...')
    await close()
    logger.lifecycle('stopped server')
    await groups.stop()
    logger.lifecycle('stopped groups')
    await welo.stop()
    logger.lifecycle('stopped welo')
    await helia.stop()
    logger.lifecycle('stopped helia')
    await libp2p.stop()
    logger.lifecycle('stopped libp2p')

    logger.lifecycle('exiting...')

    process.exit()
  })().catch(error => {
    throw error
  })
})

// Create the loops.
const loops = [
  new Looper(async () => {
    await syncLoop(components)
  }, { sleep: config.tickInterval * 1000 }),

  new Looper(async () => {
    await downloadLoop(components)
  }, { sleep: config.tickInterval * 1000 })
]

logger.lifecycle('started')

// Run the main loop.
await Promise.all(loops.map(async l => l.run()))
