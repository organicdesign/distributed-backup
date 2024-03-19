import assert from 'assert/strict'
import { handler } from '../src/commands/create-group.js'
import { mockParams } from './utils.js'

describe('create-group', () => {
	const group = 'group-abc'

  it('text', async () => {
    const params = mockParams({ createGroup: async () => group }, { name: 'name-abc', peers: [] })
    const response = await handler(params)

    assert.equal(response, group)
  })

  it('json', async () => {
    const params = mockParams({ createGroup: async () => group }, { name: 'name-abc', peers: [], json: true })
    const response = await handler(params)

    assert.equal(response, JSON.stringify({ group }))
  })
})
