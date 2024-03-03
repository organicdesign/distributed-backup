import { createBuilder, createHandler } from '../utils.js'

export const command = 'sneakernet-receive [path]'

export const desc = 'Receive sneakernet data.'

export const builder = createBuilder({
  path: {
    required: true,
    type: 'string'
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client.sneakernetReveive(argv.path)

  if (argv.json === true) {
    return JSON.stringify({ success: true })
  }

  return 'success'
})
