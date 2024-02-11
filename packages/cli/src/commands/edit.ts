import { createBuilder, createHandler } from '../utils.js'

export const command = 'edit [group] [path]'

export const desc = 'Edit an item in the distributed backup.'

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
    alias: 'p',
    type: 'number'
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client2 == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client2.edit(argv.group, argv.path, {
    priority: argv.priority
  })

  if (argv.json === true) {
    return JSON.stringify({ success: true })
  }

  return 'success'
})
