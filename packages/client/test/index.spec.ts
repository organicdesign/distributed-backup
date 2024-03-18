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
})
