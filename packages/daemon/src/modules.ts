import { z } from 'zod'
import * as FileSystem from './modules/filesystem/index.js'
import * as Network from './modules/network/index.js'
import type { Components } from './interface.js'

export const commands = [
  ...FileSystem.commands,
  ...Network.commands
] as Array<{
  name: string
  method(components: Components): (params: Record<string, unknown>) => Promise<unknown> | unknown
}>

export const Config = z.object({
  tickInterval: z.number().default(10 * 60),
  storage: z.string().default(':memory:')
})
  .merge(FileSystem.Config)
  .merge(Network.Config)

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>
