import Path from 'path'
import * as logger from 'logger'
import { FileSystem } from './file-system.js'
import { DATA_KEY } from './interface.js'
import { keyToPath } from './utils.js'
import type { Requires } from './index.js'

export default async ({ groups, downloader }: Requires): Promise<void> => {
  for (const { value: database } of groups.groups.all()) {
    const tracker = groups.getTracker(database)

    for await (const { key } of tracker.process(`/${DATA_KEY}`)) {
      const path = keyToPath(key)
      const group = database.manifest.address.cid
      const fs = new FileSystem(database)
      const fullKey = Path.join('/', group.toString(), key)
      const entry = await fs.get(path)

      logger.entry('syncing update:', fullKey)

      if (entry == null) {
        await downloader.pinManager.remove(fullKey)
        continue
      }

      await downloader.pinManager.put(fullKey, { cid: entry.cid, priority: entry.priority })
    }
  }
}
