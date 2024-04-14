import { createBuilder, createHandler } from '../utils.js'

export const command = 'edit [group] [path]'

export const desc = 'Edit the parameters of an item in the distributed backup.'

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
    required: false,
    type: 'number'
  },

  pause: {
    required: false,
    type: 'boolean'
  }
})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client.edit(argv.group, argv.path, { paused: argv.pause, priority: argv.priority })

  if (argv.json === true) {
    yield JSON.stringify({ success: true })
    return
  }

  yield 'success'
})
