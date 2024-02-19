import Path from 'path'
import * as logger from 'logger'
import { FileSystem } from './file-system.js'
import type { Requires } from './index.js'

export default async ({ groups, downloader }: Requires): Promise<void> => {
  for (const { value: database } of groups.groups.all()) {
    const tracker = groups.getTracker(database)

    for await (const { key } of tracker.process()) {
      const group = database.manifest.address.cid
      const fs = new FileSystem(database)
      logger.entry('syncing update:', Path.join(group.toString(), key))

      const entry = await fs.get(key)
      const fullKey = Path.join(group.toString(), key)

      if (entry == null) {
        await downloader.pinManager.remove(fullKey)
        continue
      }

      await downloader.pinManager.put(fullKey, { cid: entry.cid, priority: entry.priority })
    }
  }
}
