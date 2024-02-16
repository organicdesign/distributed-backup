import { CID } from 'multiformats/cid'
import type { PinManager } from './pin-manager.js'
import type { Datastore } from 'interface-datastore'
import { OperationManager } from '@/operation-manager.js'

export default async (pinManager: PinManager, datastore: Datastore): Promise<OperationManager<{
  put(groupData: Uint8Array, path: string, rawEntry: Uint8Array): Promise<void>
}>> => {
  const om = new OperationManager(datastore, {
    put: async (groupData: Uint8Array, path: string, rawEntry: Uint8Array) => {
      const group = CID.decode(groupData)

      await pinManager.process(group, path, rawEntry)
    }
  })

  await om.start()

  return om
}
