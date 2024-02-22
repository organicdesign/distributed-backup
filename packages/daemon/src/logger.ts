import { logger, type Logger } from '@libp2p/logger'
import debugModule from 'debug'

debugModule.formatArgs = function (args) {
  const dateTime = `[${new Date().toISOString()}]`
  const colorCode = `\u001b[38;5;${this.color}`
  const prefix = ` ${colorCode};1m${this.namespace} \u001b[0m`
  const content = args[0].split('\n').join(`\n${''.padStart(23)}${prefix}`)

  args[0] = `${dateTime}${prefix}${content}`
  args.push(`${colorCode}m+${this.diff}ms\u001b[0m`)
}

const APP_NAME = 'backup'

export interface Loggers {
  error: Logger
  warn: Logger
  info: Logger
}

export const createLogger = (name: string): Loggers => ({
  error: logger(`${APP_NAME}:${name}:error`),
  warn: logger(`${APP_NAME}:${name}:warning`),
  info: logger(`${APP_NAME}:${name}:info`)
})
