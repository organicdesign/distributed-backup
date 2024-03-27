import { FileSystem } from './file-system.js'
import { LocalSettings } from './local-settings.js'
import createUploadManager from './upload-operations.js'
import type { Context, Config } from './index.js'
import type { Components } from '@/common/interface.js'
import type { CID } from 'multiformats/cid'
import { extendDatastore } from '@/utils.js'

export default async (components: Components, config: Config): Promise<Context> => {
  const { groups, datastore, blockstore, welo } = components

  const localSettings = new LocalSettings({
    datastore: extendDatastore(datastore, 'references')
  })

  const getFileSystem = (group: CID): FileSystem | null => {
    const database = groups.get(group)

    if (database == null) {
      return null
    }

    return new FileSystem({
      database,
      blockstore,
      id: welo.identity.id,
      localSettings
    })
  }

  const uploads = await createUploadManager(
    { getFileSystem },
    components,
    extendDatastore(datastore, 'upload-operations')
  )

  return {
    localSettings,
    uploads,
    config,
    getFileSystem
  }
}
