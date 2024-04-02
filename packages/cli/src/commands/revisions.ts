import { createBuilder, createHandler } from '../utils.js'

export const command = 'revisions [group] [path]'

export const desc = 'Get a list of the revisions of an item.'

export const builder = createBuilder({
  group: {
    type: 'string',
    required: true
  },

  path: {
    type: 'string',
    required: true
  }
})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const result = await argv.client.listRevisions(argv.group, argv.path)

  if (argv.json === true) {
    yield JSON.stringify(result)
    return
  }

  yield * result.map(r => `${r.sequence}: ${r.cid}`)
})
