import { RevisionStrategies } from '@organicdesign/db-rpc-interfaces/zod'
import { z } from 'zod'
import setupGetSchedule from './commands/get-schedule.js'
import setupPutSchedule from './commands/put-schedule.js'
import { Schedule } from './schedule.js'
import type { Module } from '@/interface.js'
import type { CID } from 'multiformats/cid'
import { createLogger } from '@/logger.js'

export const logger = createLogger('sneakernet')

export const Config = z.object({
  defaultRevisionStrategy: RevisionStrategies.default('all')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Context extends Record<string, unknown> {
  getSchedule(group: CID): Schedule | null
}

const module: Module<Context> = async (components) => {
  const getSchedule = (group: CID): Schedule | null => {
    const database = components.groups.get(group)

    if (database == null) {
      return null
    }

    return new Schedule(database, components.welo.identity.id)
  }

  const context = { getSchedule }

  for (const setupCommand of [setupGetSchedule, setupPutSchedule]) {
    setupCommand(components, context)
  }

  return context
}

export default module
