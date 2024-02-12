import Path from 'path'
import { RevisionStrategies } from 'rpc-interfaces/zod'
import { createBuilder, createHandler } from '../utils.js'

export const command = 'import [group] [localPath] [path]'

export const desc = 'Import a file or directory to the distributed backup.'

export const builder = createBuilder({
  group: {
    required: true,
    type: 'string'
  },

  localPath: {
    required: true,
    type: 'string'
  },

  path: {
    required: false,
    type: 'string'
  },

  onlyHash: {
    alias: 'n',
    default: false,
    type: 'boolean'
  },

  encrypt: {
    default: false,
    type: 'boolean'
  },

  priority: {
    alias: 'p',
    type: 'number',
    default: 1
  },

  revisionStrategy: {
    type: 'string',
    default: 'all'
  }
})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client == null || argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const pathParts = argv.localPath.split('/')
  const name = pathParts[pathParts.length - 1]

  let path = argv.path != null ? Path.join('/', argv.path) : Path.join('/', name)

  if (path[path.length - 1] === '/') {
    path = Path.join(path, name)
  }

  const imports = await argv.client.import(argv.group, Path.resolve(argv.localPath), {
    path,
    onlyHash: argv.onlyHash,
    encrypt: argv.encrypt,
    priority: argv.priority ?? 1,
    revisionStrategy: RevisionStrategies.parse(argv.revisionStrategy)
  })

  if (argv.json === true) {
    return JSON.stringify({
      success: true,
      imports
    })
  }

  return imports.map(i => `${i.path} ${i.cid}`).join('\n')
})
