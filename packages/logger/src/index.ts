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

const createLogger = (name: string): Logger => {
  return logger(`${APP_NAME}:${name}`)
}

export const lifecycle = createLogger('lifecycle')
export const tick = createLogger('tick')
export const add = createLogger('import')
export const validate = createLogger('validate')
export const references = createLogger('references')
export const pins = createLogger('pins')
export const groups = createLogger('groups')
export const uploads = createLogger('uploads')
export const downloads = createLogger('downloads')
export const debug = createLogger('debug')
export const warn = createLogger('warning')
export const entry = createLogger('entry')
