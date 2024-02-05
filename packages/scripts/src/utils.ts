import type { ArgumentsCamelCase, Options, InferredOptionTypes } from 'yargs'

export type Builder = Record<string, Options>

export type ToArgs<T extends Builder> = ArgumentsCamelCase<InferredOptionTypes<T>>

export interface Handler<T extends Builder> { (argv: ToArgs<T>): void | Promise<void> }

export const createRawBuilder = <T extends Builder>(options: T): T => options

export const createBuilder = <T extends Builder>(options: T): T => ({
  ...options
})

export const createHandler = <T extends Builder>(
  handler: Handler<T>
): Handler<T> => handler
