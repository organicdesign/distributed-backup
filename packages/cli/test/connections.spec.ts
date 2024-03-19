import assert from 'assert/strict'
import { handler } from '../src/commands/connections.js'
import { mockParams } from './utils.js'

describe('connections', () => {
	const connections = ['connection-abc', 'connection-def', 'connection-ghi']

  it('text', async () => {
    const params = mockParams({ connections: async () => connections })
    const response = await handler(params)

    assert.equal(response, connections.join('\n'))
  })

  it('json', async () => {
    const params = mockParams({ connections: async () => connections }, { json: true })
    const response = await handler(params)

    assert.equal(response, JSON.stringify(connections))
  })
})
