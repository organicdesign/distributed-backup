import { createBuilder, createHandler } from '../utils.js'

export const command = 'addresses'

export const desc = 'Get the address of the peer.'

export const builder = createBuilder({})

export const handler = createHandler<typeof builder>(async function * (argv): AsyncIterable<string> {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const addresses = await argv.client.addresses()

  if (argv.json === true) {
    yield JSON.stringify(addresses)
    return
  }

  yield * addresses
})
