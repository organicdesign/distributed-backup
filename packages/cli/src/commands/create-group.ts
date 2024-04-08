import { z } from 'zod'
import { createBuilder, createHandler } from '../utils.js'

export const command = 'create-group [name] [peers...]'

export const desc = 'create a group.'

export const builder = createBuilder({
  name: {
    type: 'string',
    required: true
  },

  peers: {
    type: 'array',
    default: []
  }
})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const group = await argv.client.createGroup(argv.name, z.array(z.string()).parse(argv.peers))

  if (argv.json === true) {
    yield JSON.stringify({ group })
    return
  }

  yield group
})
