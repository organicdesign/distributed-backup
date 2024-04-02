import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/join-group.js'
import { mockParams } from './utils.js'

describe('join-group', () => {
  it('text', async () => {
    const params = mockParams({ joinGroup: null }, { group: 'group-abc' })

    const response = await all(handler(params))

    assert.equal(response.join('\n'), 'success')
  })

  it('json', async () => {
    const params = mockParams({ joinGroup: null }, { group: 'group-abc', json: true })

    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ success: true }))
  })
})
