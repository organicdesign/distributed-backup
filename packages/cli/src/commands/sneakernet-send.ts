import { z } from 'zod'
import { createBuilder, createHandler } from '../utils.js'

export const command = 'sneakernet-send [path] [...peers]'

export const desc = 'Create sneakernet data ready for transport.'

export const builder = createBuilder({
  path: {
    required: true,
    type: 'string'
  },

  peers: {
    required: false,
    type: 'array'
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client.sneakernetSend(argv.path, z.array(z.string()).optional().parse(argv.peers))

  if (argv.json === true) {
    return JSON.stringify({ success: true })
  }

  return 'success'
})
