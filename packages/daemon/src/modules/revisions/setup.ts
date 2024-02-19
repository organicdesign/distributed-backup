import all from 'it-all'
import * as logger from 'logger'
import { Revisions } from './revisions.js'
import selectRevisions from './select-revisions.js'
import { pathToKey } from './utils.js'
import type { Provides, Requires } from './index.js'
import type { CID } from 'multiformats/cid'

export default async ({ filesystem, network, groups }: Requires): Promise<Provides> => {
  const getRevisions = (group: CID): Revisions | null => {
    const database = groups.groups.get(group)

    if (database == null) {
      return null
    }

    return new Revisions(database, network.libp2p.peerId)
  }

  filesystem.events.addEventListener('file:added', ({ group, path, entry }) => {
    (async () => {
      const revisions = getRevisions(group)

      if (revisions == null) {
        return
      }

      await revisions.put(path, entry.sequence, entry)

      // Handle revisions.
      const rs = await all(revisions.getAll(path))

      // Filter revisions.
      const selectedRevisions = selectRevisions(
        rs.map(r => ({
          key: pathToKey(r.path, r.author, r.sequence),
          value: r.entry
        })),
        entry.revisionStrategy
      )

      for (const { path, sequence, author } of rs) {
        const hasSelectedOld = selectedRevisions.find(r => r.key === pathToKey(path, author, sequence)) != null

        if (hasSelectedOld) {
          continue
        }

        await revisions.delete(path, sequence)
      }
    })().catch(error => {
      logger.warn(error)
    })
  })

  return {
    getRevisions
  }
}
