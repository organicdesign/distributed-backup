import { createBuilder, createHandler } from '../utils.js'

export const command = 'read [group] [path] [position] [length]'

export const desc = 'Export files to the filesystem.'

export const builder = createBuilder({
  group: {
    required: true,
    type: 'string'
  },

  path: {
    required: true,
    type: 'string'
  },

  position: {
    type: 'number',
    default: 0
  },

  length: {
    type: 'number',
    default: 1024
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client2 == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const data = await argv.client2.read(argv.group, argv.path, {
    position: argv.position,
    length: argv.length
  })

  if (argv.json === true) {
    return data
  }

  return data
})
