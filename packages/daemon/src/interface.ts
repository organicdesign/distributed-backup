import type { Components } from './common/interface.js'
import type { Database, Keyvalue } from 'welo'

export interface KeyvalueDB extends Database {
  store: Keyvalue
}

export const MEMORY_MAGIC = ':memory:'

export interface ModuleMethod<
  Context extends Record<string, unknown> = Record<string, unknown>
> {
  (components: Components, context: Context): void
}

// Optional type to get around linter void issues.
export type Optional<T> = T extends undefined ? ReturnType<() => void> : T

export interface Module<
  Provides extends Record<string, unknown> = Record<string, unknown>,
  Requires extends Record<string, unknown> | undefined = undefined,
  Init extends Record<string, unknown> | undefined = undefined,
> {
  (components: Optional<Requires>, init: Optional<Init>): Promise<Provides>
}

export interface Pair<Key = unknown, Value = unknown> {
  key: Key
  value: Value
}
