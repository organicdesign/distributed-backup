import { createBuilder, createHandler } from '../utils.js'

export const command = 'join-group [group]'

export const desc = 'Join a group.'

export const builder = createBuilder({
  group: {
    type: 'string',
    required: true
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client2 == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client2.joinGroup(argv.group)

  if (argv.json === true) {
    return JSON.stringify({
      success: true
    })
  }

  return 'success'
})
