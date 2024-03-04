import Path from 'path'
import { createBuilder, createHandler } from '../utils.js'

export const command = 'import-package [group] [path]'

export const desc = 'Import a package.'

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
  if (argv.client == null || argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const result = await argv.client.importPackage(argv.group, Path.resolve(argv.path))

  if (argv.json === true) {
    return JSON.stringify({
      success: true,
      cid: result.cid,
      name: result.name
    })
  }

  return `${result.name}: ${result.cid}\n`
})
