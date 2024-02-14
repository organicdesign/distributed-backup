import fs from 'fs/promises'
import Path from 'path'
import { MemoryDatastore } from 'datastore-core'
import { FsDatastore } from 'datastore-fs'
import { createHelia } from 'helia'
import createHeliaPinManager from 'helia-pin-manager'
import * as logger from 'logger'
import { createWelo, pubsubReplicator, bootstrapReplicator } from 'welo'
import { createGroups } from './groups.js'
import createLibp2p from './libp2p.js'
import { PinManager } from './pin-manager.js'
import type { Requires, Provides } from './index.js'
import { extendDatastore, isMemory } from '@/utils.js'

export default () => async (components: Requires): Promise<Provides> => {
  const peerId = await components.keyManager.getPeerId()
  const psk = components.keyManager.getPskKey()

  if (!isMemory(components.config.storage)) {
    await fs.mkdir(Path.join(components.config.storage, 'datastore/libp2p'), { recursive: true })
  }

  const libp2pDatastore = isMemory(components.config.storage)
    ? new MemoryDatastore()
    : new FsDatastore(Path.join(components.config.storage, 'datastore/libp2p'))

  const libp2p = await createLibp2p({
    datastore: libp2pDatastore,
    psk: components.config.private ? psk : undefined,
    peerId,
    ...components.config
  })

  const helia = await createHelia({
    datastore: extendDatastore(components.datastore, 'helia/datastore'),
    libp2p,
    blockstore: components.blockstore
  })

  const welo = await createWelo({
    // @ts-expect-error Helia version mismatch here.
    ipfs: helia,
    replicators: [bootstrapReplicator(), pubsubReplicator()],
    identity: await components.keyManager.getWeloIdentity()
  })

  const groups = await createGroups({
    datastore: extendDatastore(components.datastore, 'groups'),
    welo
  })

  const heliaPinManager = await createHeliaPinManager(helia, {
    storage: isMemory(components.config.storage) ? ':memory:' : Path.join(components.config.storage, 'sqlite')
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
    datastore: extendDatastore(components.datastore, 'pin-references')
  })

  return {
    libp2p,
    welo,
    groups,
    helia,
    pinManager
  }
}
