import { RevisionStrategies } from '@organicdesign/db-rpc-interfaces/zod'
import { z } from 'zod'
import exportRevision from './commands/export-revision.js'
import listRevisions from './commands/list-revisions.js'
import readRevision from './commands/read-revision.js'
import setup from './setup.js'
import syncRevisions from './sync-revisions.js'
import type { Revisions } from './revisions.js'
import type { Module } from '@/interface.js'
import type { CID } from 'multiformats/cid'
import { createLogger } from '@/logger.js'

export const logger = createLogger('revisions')

export const Config = z.object({
  defaultRevisionStrategy: RevisionStrategies.default('all')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Context extends Record<string, unknown> {
  getRevisions (group: CID): Revisions | null
}

const module: Module<Context> = async (components) => {
  const context = await setup(components)

  for (const setupCommand of [listRevisions, exportRevision, readRevision]) {
    setupCommand(components, context)
  }

  components.tick.add(async () => syncRevisions(components))

  return context
}

export default module
