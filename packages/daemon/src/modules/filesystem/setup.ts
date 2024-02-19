import { FileSystem } from './file-system.js'
import { LocalSettings } from './local-settings.js'
import createUploadManager from './upload-operations.js'
import type { Requires, Provides, Config } from './index.js'
import type { CID } from 'multiformats/cid'
import { extendDatastore } from '@/utils.js'

export default async (components: Requires, config: Config): Promise<Provides> => {
  const getFileSystem = (group: CID): FileSystem | null => {
    const database = components.groups.groups.get(group)

    if (database == null) {
      return null
    }

    return new FileSystem(database)
  }

  const localSettings = new LocalSettings({
    datastore: extendDatastore(components.base.datastore, 'references')
  })

  const uploads = await createUploadManager(
    { getFileSystem },
    components,
    extendDatastore(components.base.datastore, 'upload-operations')
  )

  return {
    localSettings,
    uploads,
    config,
    getFileSystem
  }
}
