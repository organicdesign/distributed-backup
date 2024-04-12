import { createBuilder, createHandler } from '../utils.js'

export const command = 'resume'

export const desc = 'Resume the downloading of items, if no group or path is passed then all items will be resumed.'

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

  await argv.client.resume({ group: argv.group, path: argv.path })

  if (argv.json === true) {
    yield JSON.stringify({ success: true })
    return
  }

  yield 'success'
})
