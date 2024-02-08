import type { NetClient } from '@organicdesign/net-rpc'
import type { ArgumentsCamelCase, Options, InferredOptionTypes, MiddlewareFunction } from 'yargs'

export type Builder = Record<string, Options>

export type ToArgs<T extends Builder> =
  ArgumentsCamelCase<InferredOptionTypes<T & typeof globalOptions>> &
  Partial<AdditionalTypes>

export interface Handler<T extends Builder> { (argv: ToArgs<T>): string | Promise<string> }
export type Middleware<T extends Builder> = MiddlewareFunction<ToArgs<T>>

export const createRawBuilder = <T extends Builder>(options: T): T => options

export const createBuilder = <T extends Builder>(options: T): T & typeof globalOptions => ({
  ...globalOptions,
  ...options
})

export const createHandler = <T extends Builder>(
  handler: Handler<T>
): Handler<T> => handler

export const createMiddleware = <T extends Builder>(
  handler: Middleware<T>
): MiddlewareFunction => handler as MiddlewareFunction

export interface AdditionalTypes {
  client: NetClient
}

export const globalOptions = createRawBuilder({
  socket: {
    alias: 's',
    type: 'string',
    describe: 'The path to the daemon socket.',
    default: '/tmp/server.socket'
  },

  json: {
    type: 'boolean',
    describe: 'Output the result as JSON.',
    default: 'false'
  }
})
