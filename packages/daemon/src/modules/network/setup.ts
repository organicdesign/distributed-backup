import fs from 'fs/promises'
import Path from 'path'
import { MemoryDatastore } from 'datastore-core'
import { FsDatastore } from 'datastore-fs'
import { createHelia } from 'helia'
import createHeliaPinManager from 'helia-pin-manager'
import * as logger from 'logger'
import createLibp2p from './libp2p.js'
import { PinManager } from './pin-manager.js'
import type { Requires, Provides, Config } from './index.js'
import { extendDatastore, isMemory } from '@/utils.js'

export default async ({ base }: Requires, config: Config): Promise<Provides> => {
  const peerId = await base.keyManager.getPeerId()
  const psk = base.keyManager.getPskKey()

  if (!isMemory(config.storage)) {
    await fs.mkdir(Path.join(config.storage, 'datastore/libp2p'), { recursive: true })
  }

  const libp2pDatastore = isMemory(config.storage)
    ? new MemoryDatastore()
    : new FsDatastore(Path.join(config.storage, 'datastore/libp2p'))

  const libp2p = await createLibp2p({
    datastore: libp2pDatastore,
    psk: config.private ? psk : undefined,
    peerId,
    ...config
  })

  const helia = await createHelia({
    datastore: extendDatastore(base.datastore, 'helia/datastore'),
    libp2p,
    blockstore: base.blockstore
  })

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
    datastore: extendDatastore(base.datastore, 'pin-references')
  })

  return {
    libp2p,
    helia,
    pinManager,
    config
  }
}
