import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { createRPCClient } from '@organicdesign/db-rpc'
import { mkTestPath } from '../utils/paths.js'
import setup from '@/common/index.js'

const testPath = mkTestPath('rpc')

describe('rpc', () => {
  const socket = Path.join(testPath, 'server.socket')

  before(async () => {
    await fs.mkdir(testPath, { recursive: true })
  })

  after(async () => {
    await fs.rm(testPath, { recursive: true })
  })

  it('adds RPC methods', async () => {
    const components = await setup({ socket })
    const testData = { key: 'value' }
    const returnData = { return: 'return-value' }

    const client = createRPCClient(socket)

    const methodPromise = new Promise((resolve, reject) => {
      setTimeout(() => { reject(new Error()) }, 50)

      components.rpcServer.rpc.addMethod('test', async params => {
        resolve(params)
        return returnData
      })
    })

    const returnResult = await client.rpc.request('test', testData)

    assert.deepEqual(returnResult, returnData)
    assert.deepEqual(await methodPromise, testData)

    client.stop()
    await components.stop()
  })
})
