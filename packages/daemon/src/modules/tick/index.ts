import { z } from 'zod'
import type { Module } from '@/interface.js'
import type { Provides as ConfigModule } from '@/modules/config/index.js'
import type { Provides as Sigint } from '@/modules/sigint/index.js'
import { createLogger } from '@/logger.js'

export const logger = createLogger('tick')

const Config = z.object({
  tickInterval: z.number().default(10 * 60)
})

// eslint-disable-next-line @typescript-eslint/no-redeclare
export type Config = z.output<typeof Config>

export interface Requires extends Record<string, unknown> {
  config: ConfigModule
  sigint: Sigint
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
          logger.warn('method threw: ', error)
        }
      }

      const b = await new Promise(resolve => {
        const timeout = setTimeout(() => { resolve(false) }, config.tickInterval)

        components.sigint.onInterupt(() => {
          if (timeout != null) {
            clearTimeout(timeout)
          }

          resolve(true)
        })
      })

      if (b === true) {
        break
      }
    }
  })()

  return { config, register }
}

export default module
