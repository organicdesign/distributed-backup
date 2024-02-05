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
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client.rpc.request('export', {
    outPath: argv.outPath,
    path: argv.path,
    group: argv.group
  })

  if (argv.json === true) {
    return JSON.stringify({ success: true })
  }

  return 'success'
})
