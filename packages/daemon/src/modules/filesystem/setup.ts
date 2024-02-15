import { LocalSettings } from './local-settings.js'
import createUploadManager from './upload-operations.js'
import type { Requires, Provides, Config } from './index.js'
import { extendDatastore } from '@/utils.js'

export default async ({ base, network }: Requires, config: Config): Promise<Provides> => {
  const localSettings = new LocalSettings({
    datastore: extendDatastore(base.datastore, 'references')
  })

  const uploads = await createUploadManager(
    { base, network },
    extendDatastore(base.datastore, 'upload-operations')
  )

  return {
    localSettings,
    uploads,
    config
  }
}
