import { createBuilder, createHandler } from '../utils.js'

export const command = 'write [group] [path] [data] [position] [length]'

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
  },

  data: {
    type: 'string'
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client2 == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const length = await argv.client2.write(argv.group, argv.path, argv.data ?? '', {
    position: argv.position,
    length: argv.length
  })

  if (argv.json === true) {
    return JSON.stringify({
      success: true,
      length
    })
  }

  return `Wrote ${length} bytes.`
})
