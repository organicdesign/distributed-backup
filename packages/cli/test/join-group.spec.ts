import assert from 'assert/strict'
import { handler } from '../src/commands/join-group.js'
import { mockParams } from './utils.js'

describe('join-group', () => {
  it('text', async () => {
    const params = mockParams({ joinGroup: null }, { group: 'group-abc' })

    const response = await handler(params)

    assert.equal(response, 'success')
  })

  it('json', async () => {
    const params = mockParams({ joinGroup: null }, { group: 'group-abc', json: true })

    const response = await handler(params)

    assert.equal(response, JSON.stringify({ success: true }))
  })
})
