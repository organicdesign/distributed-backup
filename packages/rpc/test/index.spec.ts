import assert from 'assert/strict'
import Path from 'path'
import { fileURLToPath } from 'url'
import { createRPCClient, createRPCServer } from '../src/index.js'

const socketPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../server.socket')

describe('client-server rpc', () => {
  it('adds an RPC method that can be caled from the client', async () => {
    const rpcServer = await createRPCServer(socketPath)
    const rpcClient = createRPCClient(socketPath)

    const methods = [
      {
        name: 'test-1',
        params: {},
        return: {}
      },

      {
        name: 'test-2',
        params: { key: 'value' },
        return: 'test-return'
      }
    ]

    for (const method of methods) {
      rpcServer.rpc.addMethod(method.name, async (params: unknown) => {
        assert.deepEqual(method.params, params)

        return method.return
      })
    }

    for (const method of methods) {
      const result = await rpcClient.rpc.request(method.name, method.params)

      assert.deepEqual(method.return, result)
    }

    rpcClient.stop()
    await rpcServer.stop()
  })

  it('cancels an RPC method when the abort signal is called', async () => {
    const rpcServer = await createRPCServer(socketPath)
    const rpcClient = createRPCClient(socketPath)
    const method = 'abort-test'

    rpcServer.rpc.addMethod(method, async (_, options) => {
      await new Promise<void>((resolve, reject) => {
        assert(options.signal != null)

        options.signal.onabort = () => { resolve() }

        setTimeout(() => { reject(new Error('timeout')) }, 100)
      })
    })

    await rpcClient.rpc.request(method, {}, { signal: AbortSignal.timeout(10) })

    rpcClient.stop()
    await rpcServer.stop()
  })

  it('cancels all RPC methods when the client disconects', async () => {
    const rpcServer = await createRPCServer(socketPath)
    const rpcClient = createRPCClient(socketPath)
    const method = 'abort-test'

    const promise = new Promise<void>((resolve, reject) => {
      rpcServer.rpc.addMethod(method, async (_, options) => {
        assert(options.signal != null)

        options.signal.onabort = () => { resolve() }

        setTimeout(() => { reject(new Error('timeout')) }, 1000)

        await new Promise(resolve => setTimeout(resolve, 1000))
      })
    })

    const reqPromise = rpcClient.rpc.request(method, {})

    await new Promise(resolve => setTimeout(resolve, 100))

    rpcClient.stop()

    await assert.rejects(async () => reqPromise)

    await promise

    await rpcServer.stop()
  })
})
