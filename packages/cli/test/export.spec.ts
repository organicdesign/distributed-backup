import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/export.js'
import { mockParams } from './utils.js'

describe('export', () => {
  it('text', async () => {
    const params = mockParams({ export: null }, {
      group: 'group-abc',
      path: '/test/file',
      outPath: '/export/file',
      author: undefined,
      sequence: undefined
    })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), 'success')
  })

  it('json', async () => {
    const params = mockParams({ export: null }, {
      group: 'group-abc',
      path: '/test/file',
      outPath: '/export/file',
      author: undefined,
      sequence: undefined,
      json: true
    })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ success: true }))
  })
})

describe('export (revision)', () => {
  it('text', async () => {
    const params = mockParams({ exportRevision: null }, {
      group: 'group-abc',
      path: '/test/file',
      outPath: '/export/file',
      author: 'bob',
      sequence: 0
    })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), 'success')
  })

  it('json', async () => {
    const params = mockParams({ exportRevision: null }, {
      group: 'group-abc',
      path: '/test/file',
      outPath: '/export/file',
      author: 'bob',
      sequence: 0,
      json: true
    })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ success: true }))
  })
})
