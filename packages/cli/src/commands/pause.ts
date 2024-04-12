import { createBuilder, createHandler } from '../utils.js'

export const command = 'pause'

export const desc = 'Pause the downloading of items, if no group or path is passed then all items will be paused.'

export const builder = createBuilder({
  group: {
    required: false,
    type: 'string'
  },

  path: {
    required: false,
    type: 'string'
  }
})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client.pause({ group: argv.group, path: argv.path })

  if (argv.json === true) {
    yield JSON.stringify({ success: true })
    return
  }

  yield 'success'
})
