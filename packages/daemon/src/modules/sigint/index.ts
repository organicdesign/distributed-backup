import * as logger from 'logger'
import type { Module } from '@/interface.js'

export interface Provides extends Record<string, unknown> {
  onInterupt (method: (...args: any[]) => any): void
}

const module: Module<Provides> = async () => {
  const methods: Array<(...args: any[]) => any> = []

  let exiting = false

  process.on('SIGINT', () => {
    if (exiting) {
      logger.lifecycle('force exiting')
      process.exit(1)
    }

    exiting = true

    ;(async () => {
      logger.lifecycle('cleaning up...')

      for (const method of methods) {
        await method()
      }

      logger.lifecycle('exiting...')

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
