import Path from 'path'
import * as logger from 'logger'
import type { Provides, Requires } from './index.js'

export default async (context: Provides, { groups }: Requires): Promise<void> => {
  for (const { value: { database } } of groups.groups.all()) {
    // logger.validate("syncing group: %s", database.address.cid.toString());
    const index = await database.store.latest()

    for await (const pair of index.query({})) {
      const group = database.address.cid
      const path = pair.key.toString()

      // All we really want to do here is check for dirty entries.
      if (await context.pinManager.validate(group, path, pair.value)) {
        continue
      }

      logger.entry('syncing update:', Path.join(group.toString(), path))

      await context.sync.add('put', [group.bytes, path, pair.value])
    }
  }
}
