import { createBuilder, createHandler } from '../utils.js'

export const command = 'delete [group] [path]'

export const desc = 'Delete an item from a group.'

export const builder = createBuilder({
  group: {
    required: true,
    type: 'string'
  },

  path: {
    required: true,
    type: 'string'
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client2 == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const del = await argv.client2.delete(argv.group, argv.path)

  return del.map(d => d.path).join('\n')
})
