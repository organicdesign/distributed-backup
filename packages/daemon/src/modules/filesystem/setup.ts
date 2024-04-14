import { extendDatastore } from '@organicdesign/db-utils'
import { FileSystem } from './file-system.js'
import syncGroups from './sync-groups.js'
import createUploadManager from './upload-operations.js'
import type { Context, Config } from './index.js'
import type { Components } from '@/common/interface.js'
import type { CID } from 'multiformats/cid'

export default async (components: Components, config: Config): Promise<Context> => {
  const { groups, datastore, blockstore, welo } = components

  const getFileSystem = (group: CID): FileSystem | null => {
    const database = groups.get(group)

    if (database == null) {
      return null
    }

    return new FileSystem({
      database,
      blockstore,
      id: welo.identity.id,
      pinManager: components.pinManager
    })
  }

  const uploads = await createUploadManager(
    { getFileSystem },
    components,
    extendDatastore(datastore, 'upload-operations')
  )

  const sync = async (): Promise<void> => syncGroups(components, { uploads, config, sync, getFileSystem })

  components.tick.add(async () => sync())

  return {
    uploads,
    config,
    sync,
    getFileSystem
  }
}
