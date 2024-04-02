import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/connections.js'
import { mockParams } from './utils.js'

describe('connections', () => {
  const connections = ['connection-abc', 'connection-def', 'connection-ghi']

  it('text', async () => {
    const params = mockParams({ connections })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), connections.join('\n'))
  })

  it('json', async () => {
    const params = mockParams({ connections }, { json: true })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify(connections))
  })
})
