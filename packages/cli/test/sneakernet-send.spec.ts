import assert from 'assert/strict'
import { handler } from '../src/commands/sneakernet-send.js'
import { mockParams } from './utils.js'

describe('sneakernet-send', () => {
  it('text', async () => {
    const params = mockParams({ sneakernetSend: null }, { path: 'name-abc', peers: [], size: 1000 })
    const response = await handler(params)

    assert.equal(response, 'success')
  })

  it('json', async () => {
    const params = mockParams({ sneakernetSend: null }, { path: 'name-abc', peers: [], size: 1000, json: true })
    const response = await handler(params)

    assert.equal(response, JSON.stringify({ success: true }))
  })
})
