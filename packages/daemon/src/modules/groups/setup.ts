import Path from 'path'
import createHeliaPinManager from 'helia-pin-manager'
import * as logger from 'logger'
import { createWelo, pubsubReplicator, bootstrapReplicator } from 'welo'
import { createGroups } from './groups.js'
import { PinManager } from './pin-manager.js'
import type { Requires, Provides, Config } from './index.js'
import { extendDatastore, isMemory } from '@/utils.js'

export default async ({ base, network }: Requires, config: Config): Promise<Provides> => {
  const welo = await createWelo({
    // @ts-expect-error Helia version mismatch here.
    ipfs: network.helia,
    replicators: [bootstrapReplicator(), pubsubReplicator()],
    identity: await base.keyManager.getWeloIdentity()
  })

  const groups = await createGroups({
    datastore: extendDatastore(base.datastore, 'groups'),
    welo
  })

  const heliaPinManager = await createHeliaPinManager(network.helia, {
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
    welo,
    pinManager,
    groups
  }
}
