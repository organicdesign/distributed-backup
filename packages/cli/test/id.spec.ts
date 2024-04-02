import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/id.js'
import { mockParams } from './utils.js'

describe('id', () => {
  const id = 'my-id'

  it('text', async () => {
    const params = mockParams({ id })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), id)
  })

  it('json', async () => {
    const params = mockParams({ id }, { json: true })
    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({ success: true, id }))
  })
})
