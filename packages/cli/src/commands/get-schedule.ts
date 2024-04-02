import { GetSchedule } from '@organicdesign/db-rpc-interfaces'
import { createBuilder, createHandler } from '../utils.js'

export const command = 'get-schedule [group]'

export const desc = 'Get the schedule of a group.'

export const builder = createBuilder({
  group: {
    required: true,
    type: 'string'
  },

  from: {
    type: 'number'
  },

  to: {
    type: 'number'
  },

  types: {
    type: 'array'
  }
})

export const handler = createHandler<typeof builder>(async function * (argv) {
  if (argv.client == null) {
    throw new Error('Failed to connect to daemon.')
  }

  const data = await argv.client.getSchedule(argv.group, {
    from: argv.from,
    to: argv.to,
    types: GetSchedule.Params.shape.types.parse(argv.types)
  })

  if (argv.json === true) {
    yield JSON.stringify(data)
    return
  }

  yield * data.map(d => {
    const from = `${d.from}`.padEnd(15)
    const to = `${d.to}`.padEnd(15)

    const context = Object.entries(d.context)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')

    return `${from}${to}{${context}}`
  })
})
