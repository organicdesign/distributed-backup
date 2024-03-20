import type { Module } from '@/interface.js'
import { createLogger } from '@/logger.js'

export const logger = createLogger('sigint')

export interface Provides extends Record<string, unknown> {
  onInterupt (method: (...args: any[]) => any): void
  interupt (force: boolean): void
}

const module: Module<Provides> = async () => {
  const methods: Array<(...args: any[]) => any> = []

  let exiting = false

  const interupt = (force = true): void => {
    if (exiting) {
      logger.warn('force exiting')
      process.exit(1)
    }

    exiting = true

    ;(async () => {
      logger.info('cleaning up...')

      for (const method of methods) {
        await method()
      }

      logger.info('exiting...')

      if (force) {
        process.exit()
      }
    })().catch(error => {
      throw error
    })
  }

  process.on('SIGINT', interupt)

  return {
    onInterupt: (method) => methods.push(method),
    interupt
  }
}

export default module
