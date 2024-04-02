import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/delete.js'
import { mockParams } from './utils.js'

describe('delete', () => {
  const items = [{
    cid: 'group-abc',
    path: '/test/file'
  }]

  it('text', async () => {
    const params = mockParams({ delete: items }, { path: 'name-abc', group: 'group-abc' })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), items.map(i => i.path).join('\n'))
  })

  it('json', async () => {
    const params = mockParams({ delete: items }, { path: 'name-abc', group: 'group-abc', json: true })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify(items))
  })
})
