import assert from 'assert/strict'
import { handler } from '../src/commands/id.js'
import { mockParams } from './utils.js'

describe('id', () => {
  const id = 'my-id'

  it('text', async () => {
    const params = mockParams({ id })
    const response = await handler(params)

    assert.equal(response, id)
  })

  it('json', async () => {
    const params = mockParams({ id }, { json: true })
    const response = await handler(params)

    assert.equal(response, JSON.stringify({ success: true, id }))
  })
})
