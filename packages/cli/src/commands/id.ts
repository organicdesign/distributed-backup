import { createBuilder, createHandler } from '../utils.js'

export const command = 'id'

export const desc = 'Get the identity of the instance.'

export const builder = createBuilder({})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const id = await argv.client.id()

  if (argv.json === true) {
    yield JSON.stringify({ success: true, id })
    return
  }

  yield id
})
