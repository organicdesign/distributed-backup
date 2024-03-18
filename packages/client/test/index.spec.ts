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
})
