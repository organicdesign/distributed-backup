import { createBuilder, createHandler } from '../utils.js'

export const command = 'export [group] [path] [outPath]'

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

  outPath: {
    required: true,
    type: 'string'
  },

  author: {
    type: 'string'
  },

  sequence: {
    type: 'number'
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  if (argv.author != null && argv.sequence != null) {
    await argv.client.exportRevision(argv.group, argv.path, argv.author, argv.sequence, argv.outPath)
  } else {
    await argv.client.export(argv.group, argv.path, argv.outPath)
  }

  if (argv.json === true) {
    return JSON.stringify({ success: true })
  }

  return 'success'
})
