import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/sync.js'
import { mockParams } from './utils.js'

describe('sync', () => {
  it('text', async () => {
    const params = mockParams({ sync: null })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), 'success')
  })

  it('json', async () => {
    const params = mockParams({ sync: null }, { json: true })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ success: true }))
  })
})
