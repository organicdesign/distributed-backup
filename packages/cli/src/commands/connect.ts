import { createBuilder, createHandler } from '../utils.js'

export const command = 'connect [address]'

export const desc = 'Connect to a peer.'

export const builder = createBuilder({
  address: {
    type: 'string',
    required: true
  }
})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client.connect(argv.address)

  if (argv.json === true) {
    yield JSON.stringify({ success: true })
    return
  }

  yield 'success'
})
