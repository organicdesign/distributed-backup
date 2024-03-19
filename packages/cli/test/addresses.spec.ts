import assert from 'assert/strict'
import { handler } from '../src/commands/addresses.js'
import { mockParams } from './utils.js'

describe('addresses', () => {
  const addresses = ['address-abc', 'address-def', 'address-ghi']

  it('text', async () => {
    const params = mockParams({ addresses })
    const response = await handler(params)

    assert.equal(response, addresses.join('\n'))
  })

  it('json', async () => {
    const params = mockParams({ addresses }, { json: true })
    const response = await handler(params)

    assert.deepEqual(response, JSON.stringify(addresses))
  })
})
