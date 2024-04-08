import { createBuilder, createHandler } from '../utils.js'

export const command = 'sync'

export const desc = 'Sync all databases with connected peers.'

export const builder = createBuilder({})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client.sync()

  if (argv.json === true) {
    yield JSON.stringify({ success: true })
    return
  }

  yield 'success'
})
