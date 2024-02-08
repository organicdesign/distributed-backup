import { createBuilder, createHandler } from '../utils.js'

export const command = 'list-helia-pins'

export const desc = "List helia's pins."

export const builder = createBuilder({})

export const handler = createHandler<typeof builder>(async argv => {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const pins = await argv.client.rpc.request('list-helia-pins', {})

  return pins
})
