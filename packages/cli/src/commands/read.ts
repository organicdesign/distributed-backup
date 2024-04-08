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
  },

  author: {
    type: 'string'
  },

  sequence: {
    type: 'number'
  }
})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  let data: Awaited<ReturnType<typeof argv.client.read>>

  if (argv.author != null && argv.sequence != null) {
    data = await argv.client.readRevision(argv.group, argv.path, argv.author, argv.sequence, {
      position: argv.position,
      length: argv.length
    })
  } else {
    data = await argv.client.read(argv.group, argv.path, {
      position: argv.position,
      length: argv.length
    })
  }

  if (argv.json === true) {
    yield JSON.stringify({ data })
    return
  }

  yield data
})
