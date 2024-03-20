import assert from 'assert/strict'
import { handler } from '../src/commands/sync.js'
import { mockParams } from './utils.js'

describe('sync', () => {
  it('text', async () => {
    const params = mockParams({ sync: null })
    const response = await handler(params)

    assert.equal(response, 'success')
  })

  it('json', async () => {
    const params = mockParams({ sync: null }, { json: true })
    const response = await handler(params)

    assert.equal(response, JSON.stringify({ success: true }))
  })
})
