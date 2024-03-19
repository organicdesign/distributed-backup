import type { Client } from '@organicdesign/db-client'

export const mockParams = <M extends keyof Client = keyof Client, T extends Record<string, unknown> = Record<string, unknown>>(methods: { [key in M]: Awaited<ReturnType<Client[key]>> }, args?: T): {
  json: boolean
  client: Client
  socket: string
  _: string[]
  '$0': string
} & T =>
  // @ts-expect-error We want don't want the test to have to mock all the methods, only the ones that are used by a command.
    ({
      json: false,
      client: Object.entries(methods)
        .map(([key, value]) => ({ [key]: async () => value }))
        .reduce((a, c) => ({ ...a, ...c }), {}),
      socket: 'mock-socket',
      _: [],
      $0: '',
      ...args
    })
