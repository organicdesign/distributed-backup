import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/create-group.js'
import { mockParams } from './utils.js'

describe('create-group', () => {
  const group = 'group-abc'

  it('text', async () => {
    const params = mockParams({ createGroup: group }, { name: 'name-abc', peers: [] })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), group)
  })

  it('json', async () => {
    const params = mockParams({ createGroup: group }, { name: 'name-abc', peers: [], json: true })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ group }))
  })
})
