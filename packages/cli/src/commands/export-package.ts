import Path from 'path'
import { createBuilder, createHandler } from '../utils.js'

export const command = 'export-package [group] [path] [name]'

export const desc = 'Export a package to the filesystem.'

export const builder = createBuilder({
  group: {
    required: true,
    type: 'string'
  },

  path: {
    required: true,
    type: 'string'
  },

  name: {
    required: true,
    type: 'string'
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client.exportPackage(argv.group, Path.resolve(argv.path), argv.name)

  if (argv.json === true) {
    return JSON.stringify({ success: true })
  }

  return 'success'
})
