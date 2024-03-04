import { RevisionStrategies } from '@organicdesign/db-rpc-interfaces/zod'
import { z } from 'zod'
import exportPackage from './commands/export-package.js'
import importPackage from './commands/import-package.js'
import listPackages from './commands/list-packages.js'
import { Packages } from './packages.js'
import type { Module } from '@/interface.js'
import type { Provides as Base } from '@/modules/base/index.js'
import type { Provides as FileSystem } from '@/modules/filesystem/index.js'
import type { Provides as Network } from '@/modules/network/index.js'
import type { Provides as RPC } from '@/modules/rpc/index.js'
import type { CID } from 'multiformats/cid'
import { createLogger } from '@/logger.js'

export const logger = createLogger('packages')

export const Config = z.object({
  defaultRevisionStrategy: RevisionStrategies.default('all')
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Requires extends Record<string, unknown> {
  rpc: RPC
  filesystem: FileSystem
  base: Base
  network: Network
}

export interface Provides extends Record<string, unknown> {
  getPackages(group: CID): Packages | null
}

const module: Module<Provides, Requires> = async (components) => {
  const getPackages = (group: CID): Packages | null => {
    const fs = components.filesystem.getFileSystem(group)

    if (fs == null) {
      return null
    }

    return new Packages(fs)
  }

  const context = { getPackages }

  for (const setupCommand of [importPackage, listPackages, exportPackage]) {
    setupCommand(context, components)
  }

  return context
}

export default module
