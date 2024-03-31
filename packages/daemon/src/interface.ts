import type { Components } from './common/interface.js'
import type { Database, Keyvalue } from 'welo'

export interface KeyvalueDB extends Database {
  store: Keyvalue
}

export interface ModuleMethod<
  Context extends Record<string, unknown> = Record<string, unknown>
> {
  (components: Components, context: Context): void
}

// Optional type to get around linter void issues.
export type Optional<T> = T extends undefined ? ReturnType<() => void> : T

export interface Module<
  Context extends Record<string, unknown> = Record<string, unknown>
> {
  (components: Components): Promise<Context>
}

export interface Pair<Key = unknown, Value = unknown> {
  key: Key
  value: Value
}
