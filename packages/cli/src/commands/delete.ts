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

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const del = await argv.client.delete(argv.group, argv.path)

  if (argv.json === true) {
    yield JSON.stringify(del)
    return
  }

  yield * del.map(d => d.path)
})
