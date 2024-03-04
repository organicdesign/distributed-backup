import { createBuilder, createHandler } from '../utils.js'

export const command = 'read [group] [path] [position] [length]'

export const desc = 'Export files to the filesystem.'

export const builder = createBuilder({
  group: {
    required: true,
    type: 'string'
  },

  from: {
    required: true,
    type: 'number'
  },

  to: {
    required: true,
    type: 'number'
  },

  type: {
    required: true,
    type: 'string'
  },

  context: {
    required: true,
    type: 'string'
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const context = JSON.parse(argv.context)

  await argv.client.putSchedule(argv.group, argv.type, argv.from, argv.to, context)

  if (argv.json === true) {
    return JSON.stringify({ success: true })
  }

  return 'success'
})
