import assert from 'assert/strict'
import { handler } from '../src/commands/read.js'
import { mockParams } from './utils.js'

const read = 'Lorem ipsum dolor sit amet, consectetur adipisicing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.'

describe('read', () => {
  it('text', async () => {
    const params = mockParams({ read }, {
      group: 'group-abc',
      length: 1024,
      position: 0,
      path: '/my/file',
      author: undefined,
      sequence: undefined
    })

    const response = await handler(params)

    assert.equal(response, read)
  })

  it('json', async () => {
    const params = mockParams({ read }, {
      group: 'group-abc',
      length: 1024,
      position: 0,
      path: '/my/file',
      author: undefined,
      sequence: undefined,
      json: true
    })

    const response = await handler(params)

    assert.equal(response, JSON.stringify({ data: read }))
  })
})

describe('read (Revisions)', () => {
  it('text', async () => {
    const params = mockParams({ readRevision: read }, {
      group: 'group-abc',
      length: 1024,
      position: 0,
      path: '/my/file',
      author: 'bob',
      sequence: 0
    })

    const response = await handler(params)

    assert.equal(response, read)
  })

  it('json', async () => {
    const params = mockParams({ readRevision: read }, {
      group: 'group-abc',
      length: 1024,
      position: 0,
      path: '/my/file',
      author: 'bob',
      sequence: 0,
      json: true
    })

    const response = await handler(params)

    assert.equal(response, JSON.stringify({ data: read }))
  })
})
