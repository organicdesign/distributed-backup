import { createBuilder, createHandler } from '../utils.js'

export const command = 'downloader'

export const desc = 'Pause or resume the downloading of all items.'

export const builder = createBuilder({
  pause: {
    required: false,
    type: 'boolean'
  }
})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  await argv.client.downloader({ pause: argv.pause })

  if (argv.json === true) {
    yield JSON.stringify({ success: true })
    return
  }

  yield 'success'
})
