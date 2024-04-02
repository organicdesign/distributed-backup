import { createBuilder, createHandler } from '../utils.js'

export const command = 'set-priority [group] [path] [priority]'

export const desc = 'Set the priority of an item in the distributed backup.'

export const builder = createBuilder({
  group: {
    required: true,
    type: 'string'
  },

  path: {
    required: true,
    type: 'string'
  },

  priority: {
    required: true,
    type: 'number'
  }
})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client.setPriority(argv.group, argv.path, argv.priority)

  if (argv.json === true) {
    yield JSON.stringify({ success: true })
    return
  }

  yield 'success'
})
