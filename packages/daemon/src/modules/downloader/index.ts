import { z } from 'zod'
import download from './downloader.js'
import setup from './setup.js'
import type { PinManager } from './pin-manager.js'
import type { Module } from '@/interface.js'
import type { Provides as Base } from '@/modules/base/index.js'
import type { Provides as Network } from '@/modules/network/index.js'

export const Config = z.object({
  slots: z.number().int().min(1).max(100).default(20)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Init extends Record<string, unknown> {
  config: unknown
}

export interface Requires extends Record<string, unknown> {
  base: Base
  network: Network
}

export interface Provides extends Record<string, unknown> {
  pinManager: PinManager
  config: Config
}

const module: Module<Init, Requires, Provides> = async (components, init) => {
  const config = Config.parse(init.config)
  const context = await setup(components, config)

  const tick = async (): Promise<void> => {
    await download(context)
  }

  return { components: context, tick, commands: [] }
}

export default module
