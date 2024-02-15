import { createWelo, pubsubReplicator, bootstrapReplicator } from 'welo'
import { createGroups } from './groups.js'
import { PinManager } from './pin-manager.js'
import type { Requires, Provides } from './index.js'
import { extendDatastore } from '@/utils.js'

export default async ({ base, network }: Requires): Promise<Provides> => {
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

  const pinManager = new PinManager({
    pinManager: network.pinManager,
    datastore: extendDatastore(base.datastore, 'pin-references')
  })

  return {
    welo,
    pinManager,
    groups
  }
}
