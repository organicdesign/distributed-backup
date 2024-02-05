import Path from 'path'
import { createBuilder, createHandler } from '../utils.js'

export const command = 'mkdir [group] [path]'

export const desc = 'Add a file or directory to the distributed backup.'

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
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const result = await argv.client.rpc.request('mkdir', {
    group: argv.group,
    path: Path.join('/', argv.path)
  })

  return result
})
