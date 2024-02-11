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
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client2 == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client2.export(argv.group, argv.path, argv.outPath)

  if (argv.json === true) {
    return JSON.stringify({ success: true })
  }

  return 'success'
})