import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/edit.js'
import { mockParams } from './utils.js'

describe('set-priority', () => {
  it('text', async () => {
    const params = mockParams({ edit: null }, {
      path: 'name-abc',
      group: 'group-abc',
      pause: true,
      priority: 1
    })

    const response = await all(handler(params))

    assert.equal(response.join('\n'), 'success')
  })

  it('json', async () => {
    const params = mockParams({ edit: null }, {
      path: 'name-abc',
      group: 'group-abc',
      pause: true,
      priority: 1,
      json: true
    })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ success: true }))
  })
})
