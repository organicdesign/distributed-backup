import assert from 'assert/strict'
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
    const response = await handler(params)

    assert.equal(response, 'success')
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
    const response = await handler(params)

    assert.equal(response, JSON.stringify({ success: true }))
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
    const response = await handler(params)

    assert.equal(response, 'success')
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
    const response = await handler(params)

    assert.equal(response, JSON.stringify({ success: true }))
  })
})
