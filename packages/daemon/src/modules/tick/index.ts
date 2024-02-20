import * as logger from 'logger'
import { z } from 'zod'
import type { Module } from '@/interface.js'

const Config = z.object({
  tickInterval: z.number().default(10 * 60)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Init extends Record<string, unknown> { config: unknown }

export interface Requires extends Record<string, unknown> {}

export interface Provides extends Record<string, unknown> {
  config: Config
  register (method: (...args: any[]) => any): void
}

const module: Module<Init, Requires, Provides> = async (_, init) => {
  const config = Config.parse(init.config)
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

  return { components: { config, register } }
}

export default module
