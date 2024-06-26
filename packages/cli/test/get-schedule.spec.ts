import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/get-schedule.js'
import { mockParams } from './utils.js'

describe('get-schedule', () => {
  it('text', async () => {
    const items = [
      {
        from: 123,
        to: 456,
        context: { key: 'value' },
        id: 'id-1234567890',
        type: 'workflow'
      }
    ]

    const params = mockParams({ getSchedule: items }, {
      group: 'group-abc',
      from: 0,
      to: 999,
      types: ['workflow']
    })

    const response = await all(handler(params))

    const expected = items.map(d => {
      const from = `${d.from}`.padEnd(15)
      const to = `${d.to}`.padEnd(15)

      const context = Object.entries(d.context)
        .map(([key, value]) => `${key}: ${value}`)
        .join(', ')

      return `${from}${to}{${context}}`
    })

    assert.deepEqual(response, expected)
  })

  it('json', async () => {
    const items = [
      {
        from: 123,
        to: 456,
        context: { key: 'value' },
        id: 'id-1234567890',
        type: 'workflow'
      }
    ]

    const params = mockParams({ getSchedule: items }, {
      group: 'group-abc',
      from: 0,
      to: 999,
      types: ['workflow'],
      json: true
    })

    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify(items))
  })
})
