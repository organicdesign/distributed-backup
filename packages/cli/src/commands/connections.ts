import { createBuilder, createHandler } from '../utils.js'

export const command = 'connections'

export const desc = 'Get the connections of the peer.'

export const builder = createBuilder({})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const connections = await argv.client.connections()

  if (argv.json === true) {
    yield JSON.stringify(connections)
    return
  }

  yield * connections
})
