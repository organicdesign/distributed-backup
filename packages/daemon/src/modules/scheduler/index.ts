import { RevisionStrategies } from '@organicdesign/db-rpc-interfaces/zod'
import { z } from 'zod'
import setupGetSchedule from './commands/get-schedule.js'
import { Schedule } from './schedule.js'
import type { Module } from '@/interface.js'
import type { Provides as Base } from '@/modules/base/index.js'
import type { Provides as Groups } from '@/modules/groups/index.js'
import type { Provides as RPC } from '@/modules/rpc/index.js'
import type { CID } from 'multiformats/cid'
import { createLogger } from '@/logger.js'

export const logger = createLogger('sneakernet')

export const Config = z.object({
  defaultRevisionStrategy: RevisionStrategies.default('all')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Requires extends Record<string, unknown> {
  groups: Groups
  base: Base
  rpc: RPC
}

export interface Provides extends Record<string, unknown> {
  getSchedule(group: CID): Schedule | null
}

const module: Module<Provides, Requires> = async (components) => {
  const getSchedule = (group: CID): Schedule | null => {
    const database = components.groups.groups.get(group)

    if (database == null) {
      return null
    }

    return new Schedule(database)
  }

  const context = { getSchedule }

  for (const setupCommand of [setupGetSchedule]) {
    setupCommand(context, components)
  }

  return context
}

export default module
