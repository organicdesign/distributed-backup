import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/sneakernet-receive.js'
import { mockParams } from './utils.js'

describe('sneakernet-receive', () => {
  it('text', async () => {
    const params = mockParams({ sneakernetReveive: null }, { path: 'name-abc' })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), 'success')
  })

  it('json', async () => {
    const params = mockParams({ sneakernetReveive: null }, { path: 'name-abc', json: true })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ success: true }))
  })
})
