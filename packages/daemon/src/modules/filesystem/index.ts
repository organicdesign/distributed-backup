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
import type { LocalSettings } from './local-settings.js'
import type createUploadManager from './upload-operations.js'
import type { Module } from '@/interface.js'
import type { CID } from 'multiformats/cid'
import { createLogger } from '@/logger.js'

export const logger = createLogger('filesystem')

export const Config = z.object({
  defaultRevisionStrategy: RevisionStrategies.default('all')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Context extends Record<string, unknown> {
  uploads: Awaited<ReturnType<typeof createUploadManager>>
  localSettings: LocalSettings
  config: Config
  getFileSystem (group: CID): FileSystem | null
}

const module: Module<Context> = async (components) => {
  const config = components.parseConfig(Config)
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
    setupCommand(components, context)
  }

  components.tick.add(async () => syncGroups(components, context))

  return context
}

export default module
