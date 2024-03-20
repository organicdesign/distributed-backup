import assert from 'assert/strict'
import { handler } from '../src/commands/sneakernet-receive.js'
import { mockParams } from './utils.js'

describe('sneakernet-receive', () => {
  it('text', async () => {
    const params = mockParams({ sneakernetReveive: null }, { path: 'name-abc' })
    const response = await handler(params)

    assert.equal(response, 'success')
  })

  it('json', async () => {
    const params = mockParams({ sneakernetReveive: null }, { path: 'name-abc', json: true })
    const response = await handler(params)

    assert.equal(response, JSON.stringify({ success: true }))
  })
})
