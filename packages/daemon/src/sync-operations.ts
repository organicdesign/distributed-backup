import { CID } from 'multiformats/cid'
import { OperationManager } from './operation-manager.js'
import type { Components } from './interface.js'
import type { Datastore } from 'interface-datastore'

export default async (components: Pick<Components, 'pinManager' | 'groups'> & { datastore: Datastore }): Promise<OperationManager<{
  put(groupData: Uint8Array, path: string, rawEntry: Uint8Array): Promise<void>
}>> => {
  const om = new OperationManager(components.datastore, {
    put: async (groupData: Uint8Array, path: string, rawEntry: Uint8Array) => {
      const group = CID.decode(groupData)

      await components.pinManager.process(group, path, rawEntry)
    }
  })

  await om.start()

  return om
}
