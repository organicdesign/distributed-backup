import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/write.js'
import { mockParams } from './utils.js'

describe('write', () => {
  it('text', async () => {
    const params = mockParams({ write: 1024 }, { group: 'group-abc', path: '/my/file', position: 0, length: 1024, data: 'Lorem Ipsum' })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), 'Wrote 1024 bytes.')
  })

  it('json', async () => {
    const params = mockParams({ write: 1024 }, { group: 'group-abc', path: '/my/file', position: 0, length: 1024, data: 'Lorem Ipsum', json: true })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ success: true, length: 1024 }))
  })
})
