import { RevisionStrategies } from '@organicdesign/db-rpc-interfaces/zod'
import { z } from 'zod'
import del from './commands/delete.js'
import edit from './commands/edit.js'
import exportData from './commands/export.js'
import importData from './commands/import.js'
import list from './commands/list.js'
import read from './commands/read.js'
import write from './commands/write.js'
import { type FileSystem } from './file-system.js'
import setup from './setup.js'
import syncGroups from './sync-groups.js'
import type { Events } from './events.js'
import type { LocalSettings } from './local-settings.js'
import type createUploadManager from './upload-operations.js'
import type { Module } from '@/interface.js'
import type { Provides as Base } from '@/modules/base/index.js'
import type { Provides as ConfigModule } from '@/modules/config/index.js'
import type { Provides as Downloader } from '@/modules/downloader/index.js'
import type { Provides as Groups } from '@/modules/groups/index.js'
import type { Provides as Network } from '@/modules/network/index.js'
import type { Provides as RPC } from '@/modules/rpc/index.js'
import type { Provides as Tick } from '@/modules/tick/index.js'
import type { CID } from 'multiformats/cid'
import { createLogger } from '@/logger.js'

export const logger = createLogger('filesystem')

export const Config = z.object({
  defaultRevisionStrategy: RevisionStrategies.default('all')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Requires extends Record<string, unknown> {
  base: Base
  network: Network
  groups: Groups
  downloader: Downloader
  tick: Tick
  rpc: RPC
  config: ConfigModule
}

export interface Provides extends Record<string, unknown> {
  uploads: Awaited<ReturnType<typeof createUploadManager>>
  localSettings: LocalSettings
  config: Config
  getFileSystem (group: CID): FileSystem | null
  events: Events
}

const module: Module<Provides, Requires> = async (components) => {
  const config = components.config.get(Config)
  const context = await setup(components, config)

  for (const setupCommand of [
    del,
    edit,
    exportData,
    importData,
    list,
    read,
    write
  ]) {
    setupCommand(context, components)
  }

  components.tick.register(async () => syncGroups(components, context))

  return context
}

export default module
