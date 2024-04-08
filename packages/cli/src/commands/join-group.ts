import { createBuilder, createHandler } from '../utils.js'

export const command = 'join-group [group]'

export const desc = 'Join a group.'

export const builder = createBuilder({
  group: {
    type: 'string',
    required: true
  }
})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client.joinGroup(argv.group)

  if (argv.json === true) {
    yield JSON.stringify({
      success: true
    })
    return
  }

  yield 'success'
})
