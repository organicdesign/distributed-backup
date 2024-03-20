import assert from 'assert/strict'
import { handler } from '../src/commands/revisions.js'
import { mockParams } from './utils.js'

describe('revisions', () => {
  const items = [{
    cid: 'cid-abc',
    path: '/test/file',
    author: 'bob',
    sequence: 0,
    size: 500,
    blocks: 50,
    encrypted: false,
    timestamp: 123456
  }]

  it('text', async () => {
    const params = mockParams({ listRevisions: items }, { path: 'name-abc', group: 'group-abc' })
    const response = await handler(params)

    assert.equal(response, items.map(i => `${i.sequence}: ${i.cid}`).join('\n'))
  })

  it('json', async () => {
    const params = mockParams({ listRevisions: items }, { path: 'name-abc', group: 'group-abc', json: true })
    const response = await handler(params)

    assert.equal(response, JSON.stringify(items))
  })
})
