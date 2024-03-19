import assert from 'assert/strict'
import { handler } from '../src/commands/connect.js'
import { mockParams } from './utils.js'

describe('connect', () => {
	const address = 'address-abc'

  it('text', async () => {
    const params = mockParams({ connect: async (_: string) => null }, { address })
    const response = await handler(params)

    assert.equal(response, 'success')
  })

  it('json', async () => {
    const params = mockParams({ connect: async (_: string) => null }, { address, json: true })
    const response = await handler(params)

    assert.equal(response, JSON.stringify({ success: true }))
  })
})
