import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { createNetClient } from '@organicdesign/net-rpc'
import { MemoryBlockstore } from 'blockstore-core'
import { CID } from 'multiformats/cid'
import { createDag } from '../utils/dag.js'
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

  it('rpc - set priority updates local priority', async () => {
    const group = 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
    const path = '/test.txt'
    const priority = 50
    const { components, socket } = await create()
    const client = createNetClient(socket)
    const key = Path.join('/', group, path)

    await components.pinManager.put(key, { priority: 1, cid: CID.parse(group) })

    const response = await client.rpc.request('set-priority', { group, path, priority })

    assert.equal(response, null)

    const pinData = await components.pinManager.get(key)

    assert(pinData != null)
    assert.equal(pinData.priority, priority)

    client.close()
    await components.stop()
  })

  it('rpc - get speed', async () => {
    const { components, socket } = await create()
    const blockstore = new MemoryBlockstore()
    const dag = await createDag({ blockstore }, 2, 2)
    const group = 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
    const path = '/test.txt'
    const range = 500
    const client = createNetClient(socket)
    const key = Path.join('/', group, path)

    await components.pinManager.put(key, { priority: 1, cid: dag[0] })

    const speed1 = await client.rpc.request('get-speeds', {
      cids: [dag[0].toString()],
      range
    })

    assert.deepEqual(speed1, [{ cid: dag[0].toString(), speed: 0 }])

    const value = await blockstore.get(dag[0])

    await components.helia.blockstore.put(dag[0], value)
    await new Promise(resolve => setTimeout(resolve, range / 2))

    const speed2 = await client.rpc.request('get-speeds', {
      cids: [dag[0].toString()],
      range
    })

    assert.deepEqual(speed2, [{ cid: dag[0].toString(), speed: value.length / range }])

    await new Promise(resolve => setTimeout(resolve, range / 2))

    const values = await Promise.all([
      blockstore.get(dag[1]),
      blockstore.get(dag[4])
    ])

    await Promise.all([
      components.helia.blockstore.put(dag[1], values[0]),
      components.helia.blockstore.put(dag[4], values[1])
    ])

    await new Promise(resolve => setTimeout(resolve, range / 2))

    const speed3 = await client.rpc.request('get-speeds', {
      cids: [dag[0].toString()],
      range
    })

    assert.deepEqual(speed3, [{
      cid: dag[0].toString(),
      speed: values.reduce((a, c) => c.length + a, 0) / range
    }])

    client.close()
    await components.stop()
  })

  it('rpc - get status', async () => {
    const { components, socket } = await create()
    const blockstore = new MemoryBlockstore()
    const dag = await createDag({ blockstore }, 2, 2)
    const group = 'QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'
    const path = '/test.txt'
    const client = createNetClient(socket)
    const key = Path.join('/', group, path)

    const status1 = await client.rpc.request('get-status', {
      cids: [dag[0].toString()]
    })

    assert.deepEqual(status1, [{
      cid: dag[0].toString(),
      blocks: 0,
      size: 0,
      state: 'NOTFOUND'
    }])

    await components.pinManager.put(key, { priority: 1, cid: dag[0] })

    const status2 = await client.rpc.request('get-status', {
      cids: [dag[0].toString()]
    })

    assert.deepEqual(status2, [{
      cid: dag[0].toString(),
      blocks: 0,
      size: 0,
      state: 'DOWNLOADING'
    }])

    const value = await blockstore.get(dag[0])

    await components.helia.blockstore.put(dag[0], value)
    await new Promise(resolve => setTimeout(resolve, 100))

    const status3 = await client.rpc.request('get-status', {
      cids: [dag[0].toString()]
    })

    assert.deepEqual(status3, [{
      cid: dag[0].toString(),
      blocks: 1,
      size: value.length,
      state: 'DOWNLOADING'
    }])

    const values = await Promise.all(dag.map(async cid => {
      const value = await blockstore.get(cid)

      await components.helia.blockstore.put(cid, value)

      return value.length
    }))

    await new Promise(resolve => setTimeout(resolve, 500))

    const status4 = await client.rpc.request('get-status', {
      cids: [dag[0].toString()]
    })

    assert.deepEqual(status4, [{
      cid: dag[0].toString(),
      blocks: dag.length,
      size: values.reduce((a, c) => a + c, 0),
      state: 'COMPLETED'
    }])

    client.close()
    await components.stop()
  })
})
