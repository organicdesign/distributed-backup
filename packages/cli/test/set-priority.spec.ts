import assert from 'assert/strict'
import { handler } from '../src/commands/set-priority.js'
import { mockParams } from './utils.js'

describe('set-priority', () => {
  it('text', async () => {
    const params = mockParams({ setPriority: null }, { path: 'name-abc', group: 'group-abc', priority: 1 })
    const response = await handler(params)

    assert.equal(response, 'success')
  })

  it('json', async () => {
    const params = mockParams({ setPriority: null }, { path: 'name-abc', group: 'group-abc', priority: 1, json: true })
    const response = await handler(params)

    assert.equal(response, JSON.stringify({ success: true }))
  })
})
