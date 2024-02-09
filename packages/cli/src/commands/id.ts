import { createBuilder, createHandler } from '../utils.js'

export const command = 'id'

export const desc = 'Get the identity of the instance.'

export const builder = createBuilder({})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client2 == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const id = await argv.client2.id()

  return id
})
