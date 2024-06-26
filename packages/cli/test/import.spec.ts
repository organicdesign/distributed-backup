import assert from 'assert/strict'
import all from 'it-all'
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
      priority: 1,
      chunker: 'size-262144'
    })

    const response = await all(handler(params))

    assert.deepEqual(response, imports.map(i => `${i.path} ${i.cid}`))
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
      chunker: 'size-262144',
      json: true
    })

    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ success: true, imports }))
  })
})
