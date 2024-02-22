import type { Module } from '@/interface.js'
import { createLogger } from '@/logger.js'

export const logger = createLogger('sigint')

export interface Provides extends Record<string, unknown> {
  onInterupt (method: (...args: any[]) => any): void
}

const module: Module<Provides> = async () => {
  const methods: Array<(...args: any[]) => any> = []

  let exiting = false

  process.on('SIGINT', () => {
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

      process.exit()
    })().catch(error => {
      throw error
    })
  })

  return {
    onInterupt: (method) => methods.push(method)
  }
}

export default module
