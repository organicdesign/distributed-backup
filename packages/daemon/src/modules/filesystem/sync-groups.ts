import Path from 'path'
import { DATA_KEY } from './interface.js'
import { keyToPath } from './utils.js'
import { type Requires, type Provides, logger } from './index.js'

export default async ({ groups, downloader }: Requires, context: Provides): Promise<void> => {
  for (const { value: database } of groups.groups.all()) {
    const tracker = groups.getTracker(database)

    for await (const { key } of tracker.process(`/${DATA_KEY}`)) {
      const path = keyToPath(key)
      const group = database.manifest.address.cid
      const fullKey = Path.join('/', group.toString(), key)
      const fs = context.getFileSystem(group)

      if (fs == null) {
        throw new Error('saved group does not exist')
      }

      const entry = await fs.get(path)

      logger.info('[entry] syncing update:', fullKey)

      if (entry == null) {
        await downloader.pinManager.remove(fullKey)
        continue
      }

      await downloader.pinManager.put(fullKey, { cid: entry.cid, priority: entry.priority })
    }
  }
}
