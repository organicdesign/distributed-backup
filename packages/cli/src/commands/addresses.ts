import { createBuilder, createHandler } from '../utils.js'

export const command = 'addresses'

export const desc = 'Get the address of the peer.'

export const builder = createBuilder({})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client2 == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const addresses = await argv.client2.addresses()

  if (argv.json === true) {
    return JSON.stringify(addresses)
  }

  return addresses.join('\n')
})
