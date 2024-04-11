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
    const params = mockParams({ list: items, countPeers: [{ cid, peers: 1 }], getState: [{ cid, status: 'COMPLETED', size: 50, blocks: 5 }] }, { group: 'group-abc', age: 5000 })

    const response = await all(handler(params))

    const expected = [
      [
        'Name'.padEnd(50),
        'Size'.padEnd(27),
        'Speed'.padEnd(27),
        'Blocks'.padEnd(20),
        'State'.padEnd(15),
        'Priority'.padEnd(10),
        'Revisions'.padEnd(10),
        'Peers'.padEnd(10),
        'Group'.padEnd(10),
        'Encrypted'.padEnd(10),
        'R-Strategy'.padEnd(12),
        'CID'.padEnd(62)
      ].join(''),
      '',
      [
        '/my-dir/file'.padEnd(50),
        '50 B/500 B (10%)'.padEnd(27),
        '10 B/s (45 s)'.padEnd(27),
        '5/50 (10%)'.padEnd(20),
        'COMPLETED'.padEnd(15),
        '1         0         1         ',
        'QmaCpDMG  false     all         ',
        'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN                '
      ].join(''),
      '',
      [
        'Total          ',
        'Size                     ',
        'Blocks              ',
        'Speed               '
      ].join(''),
      [
        '1/1 (100%)     ',
        '50 B/500 B (10%)         ',
        '5/50 (10%)          ',
        '10 Bs               '
      ].join('')
    ]

    assert.deepEqual(response, expected)
  })

  it('json', async () => {
    const params = mockParams({
      list: items,
      countPeers: [{ cid, peers: 1 }],
      getState: [{ cid, status: 'COMPLETED', size: 50, blocks: 5 }]
    }, {
      group: 'group-abc',
      age: 5000,
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
