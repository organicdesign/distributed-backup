import { RevisionStrategies } from 'rpc-interfaces/zod'
import { z } from 'zod'
import del from './commands/delete.js'
import edit from './commands/edit.js'
import exportData from './commands/export.js'
import importData from './commands/import.js'
import list from './commands/list.js'
import read from './commands/read.js'
import revisions from './commands/revisions.js'
import write from './commands/write.js'
import download from './downloader.js'
import setup from './setup.js'
import syncGroups from './sync-groups.js'
import type { LocalSettings } from './local-settings.js'
import type { PinManager } from './pin-manager.js'
import type createSyncManager from './sync-operations.js'
import type createUploadManager from './upload-operations.js'
import type { Module } from '@/interface.js'
import type { Provides as Base } from '@/modules/base/index.js'
import type { Provides as Groups } from '@/modules/groups/index.js'
import type { Provides as Network } from '@/modules/network/index.js'

export const Config = z.object({
  defaultRevisionStrategy: RevisionStrategies.default('all')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Init extends Record<string, unknown> {
  config: unknown
}

export interface Requires extends Record<string, unknown> {
  base: Base
  network: Network
  groups: Groups
}

export interface Provides extends Record<string, unknown> {
  uploads: Awaited<ReturnType<typeof createUploadManager>>
  sync: Awaited<ReturnType<typeof createSyncManager>>
  localSettings: LocalSettings
  pinManager: PinManager
  config: Config
}

const module: Module<Init, Requires, Provides> = async (components, init) => {
  const config = Config.parse(init.config)
  const context = await setup(components, config)

  const commands = [
    del,
    edit,
    exportData,
    importData,
    list,
    read,
    revisions,
    write
  ].map(c => c(context, components))

  const tick = async (): Promise<void> => {
    await syncGroups(context, components)
    await download(context, components)
  }

  return { components: context, tick, commands }
}

export default module
