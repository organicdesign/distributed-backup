import * as logger from 'logger'
import { z } from 'zod'
import type { Module } from '@/interface.js'
import type { Provides as ConfigModule } from '@/modules/config/index.js'

const Config = z.object({
  tickInterval: z.number().default(10 * 60)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Requires extends Record<string, unknown> {
  config: ConfigModule
}

export interface Provides extends Record<string, unknown> {
  config: Config
  register (method: (...args: any[]) => any): void
}

const module: Module<Provides, Requires> = async (components) => {
  const config = components.config.get(Config)
  const methods: Array<(...args: any[]) => any> = []
  const register = (method: (...args: any[]) => any): void => { methods.push(method) }

  void (async () => {
    for (;;) {
      for (const method of methods) {
        try {
          await method()
        } catch (error) {
          logger.warn('tick method threw: ', error)
        }
      }

      await new Promise(resolve => setTimeout(resolve, config.tickInterval))
    }
  })()

  return { config, register }
}

export default module
