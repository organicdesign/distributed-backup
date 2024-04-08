import { z } from 'zod'
import { createBuilder, createHandler } from '../utils.js'

export const command = 'sneakernet-send [path] [peers...]'

export const desc = 'Create sneakernet data ready for transport.'

export const builder = createBuilder({
  path: {
    required: true,
    type: 'string'
  },

  peers: {
    required: false,
    type: 'array'
  },

  size: {
    required: false,
    type: 'number'
  }
})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client.sneakernetSend(argv.path, {
    peers: z.array(z.string()).optional().parse(argv.peers),
    size: argv.size
  })

  if (argv.json === true) {
    yield JSON.stringify({ success: true })
    return
  }

  yield 'success'
})
