import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/connect.js'
import { mockParams } from './utils.js'

describe('connect', () => {
  const address = 'address-abc'

  it('text', async () => {
    const params = mockParams({ connect: null }, { address })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), 'success')
  })

  it('json', async () => {
    const params = mockParams({ connect: null }, { address, json: true })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ success: true }))
  })
})
