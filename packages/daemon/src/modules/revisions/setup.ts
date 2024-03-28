import { CustomEvent } from '@libp2p/interface'
import all from 'it-all'
import { Revisions } from './revisions.js'
import selectRevisions from './select-revisions.js'
import { pathToKey } from './utils.js'
import { type Context, logger } from './index.js'
import type { Components } from '@/common/interface.js'
import type { CID } from 'multiformats/cid'

export default async ({ groups, welo, events }: Components): Promise<Context> => {
  const getRevisions = (group: CID): Revisions | null => {
    const database = groups.get(group)

    if (database == null) {
      return null
    }

    return new Revisions(database, welo.identity.id)
  }

  events.addEventListener('file:added', (event) => {
    if (!(event instanceof CustomEvent)) {
      return
    }

    const { detail: { group, path, entry } } = event

    ;(async () => {
      const revisions = getRevisions(group)

      if (revisions == null) {
        logger.error('file added to non-existant group')
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

        await revisions.delete(path, author, sequence)
      }
    })().catch(error => {
      logger.warn(error)
    })
  })

  return {
    getRevisions
  }
}
