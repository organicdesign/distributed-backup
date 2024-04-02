import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/addresses.js'
import { mockParams } from './utils.js'

describe('addresses', () => {
  const addresses = ['address-abc', 'address-def', 'address-ghi']

  it('text', async () => {
    const params = mockParams({ addresses })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), addresses.join('\n'))
  })

  it('json', async () => {
    const params = mockParams({ addresses }, { json: true })
    const response = await all(handler(params))

    assert.deepEqual(response.join('\n'), JSON.stringify(addresses))
  })
})
