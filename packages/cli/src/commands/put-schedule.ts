import { createBuilder, createHandler } from '../utils.js'

export const command = 'put-schedule [group] [type] [from] [to] [context]'

export const desc = 'Add an item to the groups schedule.'

export const builder = createBuilder({
  group: {
    required: true,
    type: 'string'
  },

  from: {
    required: true,
    type: 'number'
  },

  to: {
    required: true,
    type: 'number'
  },

  type: {
    required: true,
    type: 'string'
  },

  context: {
    required: true,
    type: 'string'
  }
})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const context = JSON.parse(argv.context)

  await argv.client.putSchedule(argv.group, argv.type, argv.from, argv.to, context)

  if (argv.json === true) {
    yield JSON.stringify({ success: true })
    return
  }

  yield 'success'
})
