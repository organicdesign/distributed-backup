import type { Database, Keyvalue } from 'welo'

export interface KeyvalueDB extends Database {
  store: Keyvalue
}

export const MEMORY_MAGIC = ':memory:'

export interface RPCCommandConstructor<
  Context extends Record<string, unknown> = Record<string, unknown>,
  Components extends Record<string, unknown> = Record<string, unknown>
> {
  (context: Context, components: Components): void
}

export interface Module<
  Init extends Record<string, unknown> | undefined = undefined,
  Requires extends Record<string, unknown> = Record<string, unknown>,
  Provides extends Record<string, unknown> = Record<string, unknown>,
> {
  (components: Requires, init: Init): Promise<{
    components: Provides
  }>
}

export interface Pair<Key = unknown, Value = unknown> {
  key: Key
  value: Value
}
