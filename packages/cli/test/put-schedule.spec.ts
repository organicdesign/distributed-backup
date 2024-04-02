import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/put-schedule.js'
import { mockParams } from './utils.js'

describe('put-schedule', () => {
  it('text', async () => {
    const params = mockParams({ putSchedule: null }, {
      type: 'workflow',
      from: 123,
      to: 456,
      group: 'my-group',
      context: JSON.stringify({ key: 'value' })
    })

    const response = await all(handler(params))

    assert.equal(response.join('\n'), 'success')
  })

  it('json', async () => {
    const params = mockParams({ putSchedule: null }, {
      type: 'workflow',
      from: 123,
      to: 456,
      group: 'my-group',
      context: JSON.stringify({ key: 'value' }),
      json: true
    })

    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ success: true }))
  })
})
