import Path from 'path'
import { DATA_KEY } from './interface.js'
import { keyToPath } from './utils.js'
import { type Context, logger } from './index.js'
import type { Components } from '@/common/interface.js'

export default async ({ getTracker, groups, pinManager }: Components, context: Context): Promise<void> => {
  for (const { value: database } of groups.all()) {
    const tracker = getTracker(database)

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
        await pinManager.remove(fullKey)
        continue
      }

      await pinManager.put(fullKey, { cid: entry.cid, priority: entry.priority })
    }
  }
}
