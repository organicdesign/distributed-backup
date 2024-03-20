import type { Module } from '@/interface.js'
import { createLogger } from '@/logger.js'

export const logger = createLogger('sigint')

export interface Provides extends Record<string, unknown> {
  onInterupt (method: () => unknown): void
  interupt (): void
}

const module: Module<Provides> = async () => {
  const methods: Array<() => unknown> = []

  let exiting = false

  const interupt = (): void => {
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
    })().catch(error => {
      throw error
    })
  }

  return {
    onInterupt: (method) => methods.push(method),
    interupt
  }
}

export default module
