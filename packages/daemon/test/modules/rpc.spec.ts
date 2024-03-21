import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { createNetClient } from '@organicdesign/net-rpc'
import rpc from '../../src/modules/rpc/index.js'
import createSigint from '../../src/modules/sigint/index.js'
import { mkTestPath } from '../utils/paths.js'
import mockArgv from './mock-argv.js'
import type { Provides as Argv } from '../../src/modules/argv/index.js'
import type { Provides as Sigint } from '../../src/modules/sigint/index.js'

const testPath = mkTestPath('rpc')

describe('rpc', () => {
  let argv: Argv
  let sigint: Sigint

  before(async () => {
    argv = mockArgv()
    sigint = await createSigint()

    await fs.mkdir(Path.join(argv.key, '..'), { recursive: true })
    await fs.mkdir(testPath, { recursive: true })

    await fs.writeFile(argv.key, JSON.stringify({
      key: '5TP9VimJU1WdSoTxZGLhSuPKqCpXirPHDK4ZjHxzetex-8zAV14C4oLe4dytUSVzznTuQ659pY1dSMG8HAQenDqVQ',
      psk: '/key/swarm/psk/1.0.0/\n/base16/\n56d3c18282f1f1b1b3e04e40dd5d8bf44cafa8bc9c9bc7c57716a7766fa2c550'
    }))
  })

  after(async () => {
    await fs.rm(Path.join(argv.key, '..'), { recursive: true })
    await fs.rm(testPath, { recursive: true })

    sigint.interupt()
  })

  it('adds RPC methods', async () => {
    const testData = { key: 'value' }
    const returnData = { return: 'return-value' }

    const m = await rpc({
      argv,
      sigint
    })

    const client = createNetClient(argv.socket)

    const methodPromise = new Promise((resolve, reject) => {
      setTimeout(() => { reject(new Error()) }, 50)

      m.addMethod('test', async params => {
        resolve(params)
        return returnData
      })
    })

    const returnResult = await client.rpc.request('test', testData)

    assert.deepEqual(returnResult, returnData)
    assert.deepEqual(await methodPromise, testData)

    client.close()
  })
})
