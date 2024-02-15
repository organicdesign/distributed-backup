export const MEMORY_MAGIC = ':memory:'

export interface RPCCommand {
  name: string
  method(params: Record<string, unknown>): Promise<unknown> | unknown
}

export interface RPCCommandConstructor<
  Context extends Record<string, unknown> = Record<string, unknown>,
  Components extends Record<string, unknown> = Record<string, unknown>
> {
  (context: Context, components: Components): RPCCommand
}

export interface Module<
  Init extends Record<string, unknown> | undefined = undefined,
  Requires extends Record<string, unknown> = Record<string, unknown>,
  Provides extends Record<string, unknown> = Record<string, unknown>,
> {
  (components: Requires, init: Init): Promise<{
    commands: RPCCommand[]
    components: Provides
    tick?(): void | Promise<void>
  }>
}

export interface Pair<Key = unknown, Value = unknown> {
  key: Key
  value: Value
}
