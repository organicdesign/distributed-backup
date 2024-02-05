import { createBuilder, createHandler } from '../utils.js'

export const command = 'pubsub'

export const desc = 'Get the pubsub topics of the peer.'

export const builder = createBuilder({})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const topics = await argv.client.rpc.request('pubsub', {})

  return topics
})
