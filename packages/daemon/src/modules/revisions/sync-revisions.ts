import Path from 'path'
import * as dagCbor from '@ipld/dag-cbor'
import { VERSION_KEY } from './interface.js'
import { decodeEntry } from './utils.js'
import { type Requires, logger } from './index.js'

export default async ({ groups, downloader }: Requires): Promise<void> => {
  for (const { value: database } of groups.groups.all()) {
    const tracker = groups.getTracker(database)

    for await (const { key, value } of tracker.process(`/${VERSION_KEY}`)) {
      const entry = decodeEntry(dagCbor.decode(value))
      const group = database.manifest.address.cid
      const fullKey = Path.join('/', group.toString(), key)

      logger.info('[entry] syncing update:', fullKey)

      if (entry == null) {
        await downloader.pinManager.remove(fullKey)
        continue
      }

      await downloader.pinManager.put(fullKey, { cid: entry.cid, priority: entry.priority })
    }
  }
}
