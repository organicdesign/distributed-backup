import assert from 'assert/strict'
import { handler } from '../src/commands/import.js'
import { mockParams } from './utils.js'

describe('import', () => {
  const imports = [{
    cid: 'cid-abc',
    path: '/group/file',
    inPath: '/import/file'
  }]

  it('text', async () => {
    const params = mockParams({ import: imports }, {
      group: 'group-abc',
      path: '/group/file',
      localPath: '/import/file',
      onlyHash: false,
      encrypt: false,
      revisionStrategy: 'all',
      priority: 1
    })

    const response = await handler(params)

    assert.equal(response, imports.map(i => `${i.path} ${i.cid}`).join('\n'))
  })

  it('json', async () => {
    const params = mockParams({ import: imports }, {
      group: 'group-abc',
      path: '/group/file',
      localPath: '/import/file',
      onlyHash: false,
      encrypt: false,
      revisionStrategy: 'all',
      priority: 1,
      json: true
    })

    const response = await handler(params)

    assert.equal(response, JSON.stringify({ success: true, imports }))
  })
})
