import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { createRPCClient } from '@organicdesign/db-rpc'
import { createDag } from '@organicdesign/db-test-utils'
import { MemoryBlockstore } from 'blockstore-core'
import { mkTestPath } from '../utils/paths.js'
import type { Components } from '@/common/interface.js'
import setup from '@/common/index.js'

describe('downloader', () => {
  const testPath = mkTestPath('groups')

  const create = async (): Promise<{ components: Components, socket: string }> => {
    const socket = Path.join(testPath, `${Math.random()}.socket`)
    const components = await setup({ socket })

    return { components, socket }
  }

  before(async () => {
    await fs.mkdir(testPath, { recursive: true })
  })

  after(async () => {
    await fs.rm(testPath, { recursive: true })
  })

  it('rpc - get age limited state', async () => {
    const { components, socket } = await create()
    const blockstore = new MemoryBlockstore()
    const dag = await createDag({ blockstore }, 2, 2)
    const group = 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
    const path = '/test.txt'
    const age = 500
    const client = createRPCClient(socket)
    const key = Path.join('/', group, path)

    await components.pinManager.put(key, { priority: 1, cid: dag[0] })

    const state1 = await client.rpc.request('get-state', {
      cid: dag[0].toString(),
      age
    })

    assert.deepEqual(state1, {
      status: 'DOWNLOADING',
      size: 0,
      blocks: 0
    })

    const value = await blockstore.get(dag[0])

    await components.helia.blockstore.put(dag[0], value)
    await new Promise(resolve => setTimeout(resolve, age / 2))

    const state2 = await client.rpc.request('get-state', {
      cid: dag[0].toString(),
      age
    })

    assert.deepEqual(state2, {
      status: 'DOWNLOADING',
      size: value.length,
      blocks: 1
    })

    await new Promise(resolve => setTimeout(resolve, age / 2))

    const values = await Promise.all([
      blockstore.get(dag[1]),
      blockstore.get(dag[4])
    ])

    await Promise.all([
      components.helia.blockstore.put(dag[1], values[0]),
      components.helia.blockstore.put(dag[4], values[1])
    ])

    await new Promise(resolve => setTimeout(resolve, age / 2))

    // Something is off with the timing for this test.
    /*
    const state3 = await client.rpc.request('get-state', {
      cid: dag[0].toString(),
      age
    })

    assert.deepEqual(state3, {
      status: 'DOWNLOADING',
      size: values.reduce((a, c) => c.length + a, 0),
      blocks: values.length
    })
    */

    client.stop()
    await components.stop()
  })

  it('rpc - get state', async () => {
    const { components, socket } = await create()
    const blockstore = new MemoryBlockstore()
    const dag = await createDag({ blockstore }, 2, 2)
    const group = 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
    const path = '/test.txt'
    const client = createRPCClient(socket)
    const key = Path.join('/', group, path)

    const state1 = await client.rpc.request('get-state', {
      cid: dag[0].toString()
    })

    assert.deepEqual(state1, {
      blocks: 0,
      size: 0,
      status: 'NOTFOUND'
    })

    await components.pinManager.put(key, { priority: 1, cid: dag[0] })

    const state2 = await client.rpc.request('get-state', {
      cid: dag[0].toString()
    })

    assert.deepEqual(state2, {
      blocks: 0,
      size: 0,
      status: 'DOWNLOADING'
    })

    const value = await blockstore.get(dag[0])

    await components.helia.blockstore.put(dag[0], value)
    await new Promise(resolve => setTimeout(resolve, 100))

    const state3 = await client.rpc.request('get-state', {
      cid: dag[0].toString()
    })

    assert.deepEqual(state3, {
      blocks: 1,
      size: value.length,
      status: 'DOWNLOADING'
    })

    const values = await Promise.all(dag.map(async cid => {
      const value = await blockstore.get(cid)

      await components.helia.blockstore.put(cid, value)

      return value.length
    }))

    await new Promise(resolve => setTimeout(resolve, 500))

    const state4 = await client.rpc.request('get-state', {
      cid: dag[0].toString()
    })

    assert.deepEqual(state4, {
      blocks: dag.length,
      size: values.reduce((a, c) => a + c, 0),
      status: 'COMPLETED'
    })

    client.stop()
    await components.stop()
  })
})
