import type { Module } from '@/interface.js'
import { createLogger } from '@/logger.js'

export const logger = createLogger('sigint')

export interface Provides extends Record<string, unknown> {
  onInterupt (method: () => unknown): void
  interupt (): Promise<void>
}

const module: Module<Provides> = async () => {
  const methods: Array<() => unknown> = []

  let exiting = false

  const interupt = async (): Promise<void> => {
    if (exiting) {
      logger.warn('force exiting')
      process.exit(1)
    }

    exiting = true

    logger.info('cleaning up...')

    for (const method of methods) {
      try {
        await method()
      } catch (error) {
        logger.error(error)
      }
    }

    logger.info('exiting...')
  }

  return {
    onInterupt: (method) => methods.push(method),
    interupt
  }
}

export default module
