import { EventTarget } from 'ts-event-target'
import { FileSystem } from './file-system.js'
import { LocalSettings } from './local-settings.js'
import createUploadManager from './upload-operations.js'
import type { Events } from './events.js'
import type { Requires, Provides, Config } from './index.js'
import type { CID } from 'multiformats/cid'
import { extendDatastore } from '@/utils.js'

export default async (components: Requires, config: Config): Promise<Provides> => {
  const events: Events = new EventTarget()

  const localSettings = new LocalSettings({
    datastore: extendDatastore(components.base.datastore, 'references')
  })

  const getFileSystem = (group: CID): FileSystem | null => {
    const database = components.groups.groups.get(group)

    if (database == null) {
      return null
    }

    return new FileSystem({
      database,
      blockstore:
      components.base.blockstore,
      id: components.groups.welo.identity.id,
      localSettings
    })
  }

  const uploads = await createUploadManager(
    { getFileSystem, events },
    components,
    extendDatastore(components.base.datastore, 'upload-operations')
  )

  return {
    localSettings,
    uploads,
    config,
    getFileSystem,
    events
  }
}
