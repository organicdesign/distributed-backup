import Path from 'path'
import * as dagCbor from '@ipld/dag-cbor'
import { VERSION_KEY, EncodedEntry } from './interface.js'
import { decodeEntry } from './utils.js'
import { type Requires, logger } from './index.js'

export default async ({ groups, downloader }: Requires): Promise<void> => {
  for (const { value: database } of groups.groups.all()) {
    const tracker = groups.getTracker(database)
    const group = database.manifest.address.cid

    for await (const { key, value } of tracker.process(`/${VERSION_KEY}`)) {
      const data = EncodedEntry.parse(dagCbor.decode(value))
      const fullKey = Path.join('/', group.toString(), key)

      if (data == null) {
        await downloader.pinManager.remove(fullKey)
        continue
      }

      const entry = decodeEntry(data)

      logger.info('[entry] syncing update:', fullKey)

      await downloader.pinManager.put(fullKey, { cid: entry.cid, priority: entry.priority })
    }
  }
}
