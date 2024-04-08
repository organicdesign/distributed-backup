import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/sneakernet-send.js'
import { mockParams } from './utils.js'

describe('sneakernet-send', () => {
  it('text', async () => {
    const params = mockParams({ sneakernetSend: null }, { path: 'name-abc', peers: [], size: 1000 })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), 'success')
  })

  it('json', async () => {
    const params = mockParams({ sneakernetSend: null }, { path: 'name-abc', peers: [], size: 1000, json: true })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ success: true }))
  })
})
