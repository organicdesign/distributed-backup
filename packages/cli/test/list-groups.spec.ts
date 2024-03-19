import assert from 'assert/strict'
import { handler } from '../src/commands/list-groups.js'
import { mockParams } from './utils.js'

describe('list-groups', () => {
  const groups = [
    {
      group: 'group-abc',
      name: 'my-group'
    }
  ]

  it('text', async () => {
    const params = mockParams({ listGroups: groups, countPeers: [], list: [] }, { group: 'group-abc' })

    const response = await handler(params)

    assert.equal(response, `${'Name'.padEnd(34)}${'Items'.padEnd(10)}${'Peers'.padEnd(10)}${'CID'.padEnd(62)}\n${groups.map(({ name, group }) => `${name.padEnd(34)}${'0'.padEnd(10)}${'0'.padEnd(10)}${group.padEnd(62)}`).join('\n')}`)
  })

  it('json', async () => {
    const params = mockParams({ listGroups: groups, countPeers: [], list: [] }, { group: 'group-abc', json: true })

    const response = await handler(params)

    assert.equal(response, JSON.stringify(groups))
  })
})
