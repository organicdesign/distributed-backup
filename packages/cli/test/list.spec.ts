import assert from 'assert/strict'
import all from 'it-all'
import { handler } from '../src/commands/list.js'
import { mockParams } from './utils.js'

describe('list', () => {
  const cid = 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'

  const items = [
    {
      name: 'file',
      group: 'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
      path: '/my-dir/file',
      cid,
      priority: 1,
      blocks: 50,
      size: 500,
      timestamp: 123456,
      encrypted: false,
      author: 'GZsJqUmyVjBm8bk7Gkdb3MVTspKUYYn1P5hriJMnxkahxp9jpi',
      revisionStrategy: 'all' as const
    }
  ]

  it('text', async () => {
    const params = mockParams({ list: items, countPeers: [{ cid, peers: 1 }], getStatus: [{ cid, state: 'COMPLETED', size: 50, blocks: 5 }], getSpeeds: [{ cid, speed: 1000 }] }, { group: 'group-abc' })

    const response = await all(handler(params))

    let expected = 'Name'.padEnd(20)

    expected += 'Size'.padEnd(27)
    expected += 'Speed'.padEnd(27)
    expected += 'Blocks'.padEnd(20)
    expected += 'State'.padEnd(15)
    expected += 'Priority'.padEnd(10)
    expected += 'Revisions'.padEnd(10)
    expected += 'Peers'.padEnd(10)
    expected += 'Group'.padEnd(10)
    expected += 'Encrypted'.padEnd(10)
    expected += 'R-Strategy'.padEnd(12)
    expected += 'CID'.padEnd(62)
    expected += '\n'
    expected += '/\n'
    expected += '  my-dir/\n'
    expected += '    file'
    expected += '            50 B/500 B (10%)'
    expected += '           1000 KB/s (1 s)'
    expected += '            5/50 (10%)'
    expected += '          COMPLETED'
    expected += '      1         0         1'
    expected += '         QmaCpDMG  false     all'
    expected += '         QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
    expected += '                \n\n'
    expected += 'Total'
    expected += '          Size'
    expected += '                     Blocks'
    expected += '              Speed'
    expected += '               \n'
    expected += '1/1 (100%)'
    expected += '     50 B/500 B (10%)'
    expected += '         5/50 (10%)'
    expected += '          1000 KBs            '

    assert.equal(response.join('\n'), expected)
  })

  it('json', async () => {
    const params = mockParams({
      list: items,
      countPeers: [{ cid, peers: 1 }],
      getStatus: [{ cid, state: 'COMPLETED', size: 50, blocks: 5 }],
      getSpeeds: [{ cid, speed: 1000 }]
    }, {
      group: 'group-abc',
      json: true
    })

    const response = await all(handler(params))

    assert.equal(response.join('\n'), JSON.stringify({
      items,
      total: {
        blocks: 50,
        size: 500,
        count: 1
      }
    }))
  })
})
