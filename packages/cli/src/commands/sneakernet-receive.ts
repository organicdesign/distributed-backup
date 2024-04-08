import { createBuilder, createHandler } from '../utils.js'

export const command = 'sneakernet-receive [path]'

export const desc = 'Receive sneakernet data.'

export const builder = createBuilder({
  path: {
    required: true,
    type: 'string'
  }
})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client.sneakernetReveive(argv.path)

  if (argv.json === true) {
    yield JSON.stringify({ success: true })
    return
  }

  yield 'success'
})
