import assert from 'assert/strict'
import Path from 'path'
import { fileURLToPath } from 'url'
import * as interfaces from '@organicdesign/db-rpc-interfaces'
import { createNetServer, type NetServer } from '@organicdesign/net-rpc'
import { Client } from '../src/index.js'

const socketPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../server.socket')

let server: NetServer

const getRequest = async (name: string, method: (params: Record<string, unknown>) => Promise<unknown>, timeout = 100): Promise<Record<string, unknown>> => {
  return new Promise((resolve, reject) => {
    const tId = setTimeout(reject, timeout)

    server.rpc.addMethod(name, async params => {
      server.rpc.removeMethod(name)

      clearTimeout(tId)
      resolve(params)

      return method(params)
    })
  })
}

before(async () => {
  server = await createNetServer(socketPath)
})

after(async () => {
  await server.close()
})

describe('client', () => {
  it('connects and disconnects to a server', () => {
    const client = new Client(socketPath)

    client.stop()
  })
})

describe('addresses', () => {
  let client: Client

  before(async () => {
    client = new Client(socketPath)
  })

  after(() => {
    client.stop()
  })

  it('handles address requests/responses', async () => {
    const responses = [
      [],
      ['/ip4/127.0.0.1/tcp/1234'],
      ['/ip4/127.0.0.1/tcp/1234', '/ip4/127.0.0.1/tcp/1235/ws']
    ]

    for (const addresses of responses) {
      const [req, res] = await Promise.all([
        getRequest(interfaces.Addresses.name, async () => addresses),
        client.addresses()
      ])

      assert.deepEqual(req, {})
      assert.deepEqual(res, addresses)
    }
  })

  it('handles connect requests/responses', async () => {
    const addresses = [
      '/ip4/127.0.0.1/tcp/1234',
      '/ip4/127.0.0.1/tcp/1235/ws'
    ]

    for (const address of addresses) {
      const [req, res] = await Promise.all([
        getRequest(interfaces.Connect.name, async () => null),
        client.connect(address)
      ])

      assert.deepEqual(req, { address })
      assert.deepEqual(res, null)
    }
  })

  it('handles connections requests/responses', async () => {
    const addrs = [
      [
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
      ],

      [
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
      ],

      [
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
        '/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
        '/ip4/104.131.131.82/tcp/4001/p2p/QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ'
      ]
    ]

    for (const addresses of addrs) {
      const [req, res] = await Promise.all([
        getRequest(interfaces.Connections.name, async () => addresses),
        client.connections()
      ])

      assert.deepEqual(req, {})
      assert.deepEqual(res, addresses)
    }
  })

  it('handles countPeers requests/responses', async () => {
    const requests = [
      {
        params: [
          'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
        ],
        response: [
          {
            cid: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
            peers: 0
          }
        ]
      },
      {
        params: [
          'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
          'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
        ],
        response: [
          {
            cid: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
            peers: 0
          },
          {
            cid: 'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
            peers: 1
          }
        ]
      },
      {
        params: [
          'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
          'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
          'QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb',
          'QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
          'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ'
        ],
        response: [
          {
            cid: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
            peers: 0
          },
          {
            cid: 'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
            peers: 1
          },
          {
            cid: 'QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt',
            peers: 3
          },
          {
            cid: 'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
            peers: 50
          },
          {
            cid: 'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
            peers: 999
          }
        ]
      }
    ]

    for (const { params, response } of requests) {
      const [req, res] = await Promise.all([
        getRequest(interfaces.CountPeers.name, async () => response),
        client.countPeers(params)
      ])

      assert.deepEqual(req, { cids: params })
      assert.deepEqual(res, response)
    }
  })

  it('handles createGroup requests/responses', async () => {
    const requests = [
      {
        params: {
          name: 'test'
        },
        response: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
      },
      {
        params: {
          name: 'test',
          peers: ['GZsJqUjmbVqZCUMbJoe5ye4xfdKZVPVwBoFFQiyCZYesq6Us5b']
        },
        response: 'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
      },
      {
        params: {
          name: 'test',
          peers: [
            'GZsJqUjmbVqZCUMbJoe5ye4xfdKZVPVwBoFFQiyCZYesq6Us5b',
            'GZsJqUmyVjBm8bk7Gkdb3MVTspKUYYn1P5hriJMnxkahxp9jpi'
          ]
        },
        response: 'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ'
      }
    ]

    for (const { params, response } of requests) {
      const [req, res] = await Promise.all([
        getRequest(interfaces.CreateGroup.name, async () => response),
        client.createGroup(params.name, params.peers)
      ])

      assert.deepEqual(req, { name: params.name, peers: params.peers ?? [] })
      assert.deepEqual(res, response)
    }
  })

  it('handles delete requests/responses', async () => {
    const requests = [
      {
        params: {
          group: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
          path: '/'
        },
        response: [
          {
            path: '/test/test.txt',
            cid: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
          }
        ]
      },
      {
        params: {
          group: 'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
          path: '/'
        },
        response: [
          {
            path: '/test/test.txt',
            cid: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
          },
          {
            path: '/test/test-2.txt',
            cid: 'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ'
          }
        ]
      },
      {
        params: {
          group: 'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
          path: '/test/test.txt'
        },
        response: [
          {
            path: '/test/test.txt',
            cid: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
          }
        ]
      }
    ]

    for (const { params, response } of requests) {
      const [req, res] = await Promise.all([
        getRequest(interfaces.Delete.name, async () => response),
        client.delete(params.group, params.path)
      ])

      assert.deepEqual(req, params)
      assert.deepEqual(res, response)
    }
  })

  it('handles edit requests/responses', async () => {
    const requests = [
      {
        group: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
        path: '/'
      },
      {
        group: 'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
        path: '/',
        priority: 1
      },
      {
        group: 'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
        path: '/test/test.txt',
        RevisionStrategy: 'all'
      },
      {
        group: 'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
        path: '/test/test-2.txt',
        priority: 100,
        RevisionStrategy: 'log'
      }
    ]

    for (const params of requests) {
      const [req, res] = await Promise.all([
        getRequest(interfaces.Edit.name, async () => null),
        client.edit(params.group, params.path, params)
      ])

      assert.deepEqual(req, params)
      assert.deepEqual(res, null)
    }
  })

  it('handles exportRevision requests/responses', async () => {
    const requests = [
      {
        group: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
        path: '/',
        author: 'GZsJqUjmbVqZCUMbJoe5ye4xfdKZVPVwBoFFQiyCZYesq6Us5b',
        sequence: 0,
        outPath: '/export/data'
      },
      {
        group: 'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
        path: '/my/file',
        author: 'GZsJqUmyVjBm8bk7Gkdb3MVTspKUYYn1P5hriJMnxkahxp9jpi',
        sequence: 23,
        outPath: '/export/data/file'
      }
    ]

    for (const params of requests) {
      const [req, res] = await Promise.all([
        getRequest(interfaces.ExportRevision.name, async () => null),
        client.exportRevision(params.group, params.path, params.author, params.sequence, params.outPath)
      ])

      assert.deepEqual(req, params)
      assert.deepEqual(res, null)
    }
  })

  it('handles export requests/responses', async () => {
    const requests = [
      {
        group: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
        path: '/',
        outPath: '/export/data'
      },
      {
        group: 'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
        path: '/my/file',
        outPath: '/export/data/file'
      }
    ]

    for (const params of requests) {
      const [req, res] = await Promise.all([
        getRequest(interfaces.Export.name, async () => null),
        client.export(params.group, params.path, params.outPath)
      ])

      assert.deepEqual(req, params)
      assert.deepEqual(res, null)
    }
  })

  it('handles getSchedule requests/responses', async () => {
    const requests = [
      {
        params: {
          group: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
        },
        response: [
          {
            from: 123,
            to: 456,
            type: 'test',
            id: '123',
            context: {}
          }
        ]
      },
      {
        params: {
          group: 'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
          from: 1710808436315,
          to: 1710808439315
        },
        response: [
          {
            from: 1710808436320,
            to: 1710808436330,
            type: 'test',
            id: '456',
            context: {}
          },
          {
            from: 1710808436325,
            to: 1710808436335,
            type: 'workflow',
            id: '789',
            context: { key: 'value' }
          }
        ]
      },
      {
        params: {
          group: 'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
          types: ['workflow']
        },
        response: [
          {
            from: 1710808436320,
            to: 1710808436330,
            type: 'workflow',
            id: 'abc',
            context: {}
          },
          {
            from: 1710808436325,
            to: 1710808436335,
            type: 'workflow',
            id: 'def',
            context: { key: 'value' }
          }
        ]
      },
      {
        params: {
          group: 'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
          from: 1710808436315,
          to: 1710808439315,
          types: ['workflow', 'download']
        },
        response: [
          {
            from: 1710808436320,
            to: 1710808436330,
            type: 'workflow',
            id: 'ghi',
            context: {}
          },
          {
            from: 1710808436325,
            to: 1710808436335,
            type: 'download',
            id: 'jkl',
            context: { key: 'value' }
          }
        ]
      }
    ]

    for (const { params, response } of requests) {
      const [req, res] = await Promise.all([
        getRequest(interfaces.GetSchedule.name, async () => response),
        client.getSchedule(params.group, params)
      ])

      assert.deepEqual(req, { ...params })
      assert.deepEqual(res, response)
    }
  })

  it('handles getSpeeds requests/responses', async () => {
    const requests = [
      {
        params: {
          cids: ['QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN']
        },
        response: [
          {
            cid: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
            speed: 1000000
          }
        ]
      },
      {
        params: {
          cids: ['QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ'],
          range: 1000
        },
        response: []
      },
      {
        params: {
          cids: [
            'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
            'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
          ],
          range: 10000
        },
        response: [
          {
            cid: 'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
            speed: 0
          },
          {
            cid: 'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
            speed: 1234567
          }
        ]
      }
    ]

    for (const { params, response } of requests) {
      const [req, res] = await Promise.all([
        getRequest(interfaces.GetSpeeds.name, async () => response),
        client.getSpeeds(params.cids, params.range)
      ])

      assert.deepEqual(req, { ...params })
      assert.deepEqual(res, response)
    }
  })

  it('handles getStatus requests/responses', async () => {
    const requests = [
      {
        params: {
          cids: ['QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN']
        },
        response: [
          {
            cid: 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN',
            state: 'DOWNLOADING',
            blocks: 12,
            size: 1234
          }
        ]
      },
      {
        params: {
          cids: ['QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ']
        },
        response: []
      },
      {
        params: {
          cids: [
            'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
            'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa'
          ]
        },
        response: [
          {
            cid: 'QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ',
            state: 'COMPLETED',
            blocks: 1,
            size: 0
          },
          {
            cid: 'QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa',
            state: 'NOTFOUND',
            blocks: 0,
            size: 0
          }
        ]
      }
    ]

    for (const { params, response } of requests) {
      const [req, res] = await Promise.all([
        getRequest(interfaces.GetStatus.name, async () => response),
        client.getStatus(params.cids)
      ])

      assert.deepEqual(req, { ...params })
      assert.deepEqual(res, response)
    }
  })
})
