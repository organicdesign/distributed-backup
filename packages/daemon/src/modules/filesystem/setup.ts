import { LocalSettings } from './local-settings.js'
import { PinManager } from './pin-manager.js'
import createSyncManager from './sync-operations.js'
import createUploadManager from './upload-operations.js'
import type { Requires, Provides, Config } from './index.js'
import { extendDatastore } from '@/utils.js'

export default async (components: Requires, config: Config): Promise<Provides> => {
  const localSettings = new LocalSettings({
    datastore: extendDatastore(components.base.datastore, 'references')
  })

  const pinManager = new PinManager({
    pinManager: components.network.pinManager,
    datastore: extendDatastore(components.base.datastore, 'pin-references')
  })

  const uploads = await createUploadManager(
    components,
    pinManager,
    extendDatastore(components.base.datastore, 'upload-operations')
  )

  const sync = await createSyncManager(
    pinManager,
    extendDatastore(components.base.datastore, 'sync-operations')
  )

  return {
    pinManager,
    localSettings,
    uploads,
    sync,
    config
  }
}
