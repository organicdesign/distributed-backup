import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/pause.js'
import { mockParams } from './utils.js'

describe('pause', () => {
  it('text', async () => {
    const params = mockParams({ pause: null }, {
      group: 'group-abc',
      path: '/my/file'
    })

    const response = await all(handler(params))

    assert.equal(response.join('\n'), 'success')
  })

  it('json', async () => {
    const params = mockParams({ pause: null }, {
      group: 'group-abc',
      path: '/my/file',
      json: true
    })

    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ success: true }))
  })
})
