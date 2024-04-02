import assert from 'assert/strict'
import all from 'it-all'
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

    const [header, ...response] = await all(handler(params))

    assert.equal(
      header,
      `${'Name'.padEnd(34)}${'Items'.padEnd(10)}${'Peers'.padEnd(10)}${'CID'.padEnd(62)}`
    )

    assert.deepEqual(
      response,
      groups.map(({ name, group }) => `${name.padEnd(34)}${'0'.padEnd(10)}${'0'.padEnd(10)}${group.padEnd(62)}`)
    )
  })

  it('json', async () => {
    const params = mockParams({ listGroups: groups, countPeers: [], list: [] }, { group: 'group-abc', json: true })

    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify(groups))
  })
})
