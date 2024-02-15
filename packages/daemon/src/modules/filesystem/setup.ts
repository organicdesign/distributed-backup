import { LocalSettings } from './local-settings.js'
import createSyncManager from './sync-operations.js'
import createUploadManager from './upload-operations.js'
import type { Requires, Provides, Config } from './index.js'
import { extendDatastore } from '@/utils.js'

export default async (components: Requires, config: Config): Promise<Provides> => {
  const localSettings = new LocalSettings({
    datastore: extendDatastore(components.base.datastore, 'references')
  })

  const uploads = await createUploadManager(
    components,
    extendDatastore(components.base.datastore, 'upload-operations')
  )

  const sync = await createSyncManager(
    components,
    extendDatastore(components.base.datastore, 'sync-operations')
  )

  return {
    localSettings,
    uploads,
    sync,
    config
  }
}
