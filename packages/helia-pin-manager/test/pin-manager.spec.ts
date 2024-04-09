import assert from 'assert/strict'
import EventEmitter from 'events'
import { addBlocks, createDag } from '@organicdesign/db-test-utils'
import * as cborg from 'cborg'
import { MemoryDatastore, NamespaceDatastore } from 'datastore-core'
import { Key, type Datastore } from 'interface-datastore'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { PinManager, type Components } from '../src/pin-manager.js'
import createHelia from './utils/helia.js'

const DAG_WIDTH = 2
const DAG_DEPTH = 3

EventEmitter.setMaxListeners(100)

describe('pin manager', () => {
  let components: Components
  let pm: PinManager
  let pinsDatastore: Datastore
  let blocksDatastore: Datastore
  let downloadsDatastore: Datastore
  let dag: CID[]

  const data: {
    pins: Array<{ cid: CID, status: 'COMPLETED', size: number, depth: number }>
    blocks: Array<{ cid: CID, size: number, depth: number }>
  } = {
    pins: [],
    blocks: []
  }

  const createPins = async (data: Array<{ cid: CID, depth: number, status: string }>): Promise<void> => {
    const pairs = data.map(d => ({
      key: new Key(d.cid.toString()),
      value: cborg.encode({ depth: d.depth, status: d.status })
    }))

    await all(pinsDatastore.putMany(pairs))
  }

  const createBlocks = async (data: Array<{ cid: CID, pinnedBy: CID, depth: number, size: number }>): Promise<void> => {
    const pairs = data.map(d => ({
      key: new Key(`/${d.pinnedBy.toString()}/${d.cid.toString()}`),
      value: cborg.encode({ depth: d.depth, size: d.size, timestamp: Date.now() })
    }))

    await all(blocksDatastore.putMany(pairs))
  }

  const createDownloads = async (data: Array<{ cid: CID, pinnedBy: CID, depth: number }>): Promise<void> => {
    const pairs = data.map(d => ({
      key: new Key(`/${d.pinnedBy.toString()}/${d.cid.toString()}`),
      value: cborg.encode({ depth: d.depth })
    }))

    await all(downloadsDatastore.putMany(pairs))
  }

  before(async () => {
    const helia = await createHelia()
    const datastore = new MemoryDatastore()

    pinsDatastore = new NamespaceDatastore(datastore, new Key('pins'))
    blocksDatastore = new NamespaceDatastore(datastore, new Key('blocks'))
    downloadsDatastore = new NamespaceDatastore(datastore, new Key('downloads'))

    components = {
      helia,
      datastore
    }

    dag = await createDag(components.helia, DAG_DEPTH, DAG_WIDTH)

    pm = new PinManager(components)

    const rb = await addBlocks(helia)
    const blocks = rb.map(b => ({ ...b, status: 'COMPLETED' as const, depth: 1, size: b.block.length }))

    data.blocks = blocks
    data.pins = blocks
  })

  after(async () => {
    await components.helia.stop()
  })

  afterEach(async () => {
    const promises = []

    for await (const key of components.datastore.queryKeys({})) {
      promises.push(components.datastore.delete(key))
    }

    await Promise.all(promises)
  })

  it('constructs', () => {
    const pinManager = new PinManager(components)

    assert(pinManager)
  })

  it('all returns all the pins', async () => {
    await createPins(data.pins)

    const pins = await pm.all()

    for (const pin of pins) {
      assert(data.pins.find(p => p.cid.equals(pin.cid)))
    }
  })

  describe('unpin', () => {
    it('destorys the pin row', async () => {
      await createPins(data.pins)

      await Promise.all(data.pins.map(async pin => {
        await pm.unpin(pin.cid)

        const p = (async (): Promise<Uint8Array> => pinsDatastore.get(new Key(pin.cid.toString()))) as () => Promise<Uint8Array>

        await assert.rejects(p)
      }))
    })

    it('destorys all linked blocks', async () => {
      const pin = data.pins[0]

      await createPins([pin])
      await createBlocks(data.blocks.map(b => ({ ...b, pinnedBy: pin.cid })))
      await pm.unpin(pin.cid)

      const blocks = await all(blocksDatastore.query({}))

      assert.equal(blocks.length, 0)
    })

    it('destorys all linked downloads', async () => {
      const pin = data.pins[0]

      await createPins([pin])
      await createDownloads(data.blocks.map(b => ({ ...b, pinnedBy: pin.cid })))
      await pm.unpin(pin.cid)

      const downloads = await all(downloadsDatastore.query({}))

      assert.equal(downloads.length, 0)
    })

    it('unpins it from helia', async () => {
      const pin = data.pins[0]

      await all(components.helia.pins.add(pin.cid))
      await createPins([pin])
      await pm.unpin(pin.cid)

      const isPinned = await components.helia.pins.isPinned(pin.cid)

      assert(!isPinned)
    })

    it('emits pins:removed event', async () => {
      const pin = data.pins[0]

      await all(components.helia.pins.add(pin.cid))

      const promise = new Promise<void>((resolve, reject) => {
        pm.events.addEventListener('pins:removed', () => {
          resolve()
        })

        setTimeout(reject, 3000)
      })

      await pm.unpin(pin.cid)

      await promise
    })
  })

  describe('pinLocal', () => {
    it('adds the root as a pin', async () => {
      const root = dag[0]

      await pm.pinLocal(root)

      const raw = await pinsDatastore.get(new Key(root.toString()))
      const data = cborg.decode(raw)

      assert(data)
    })

    it('adds all the items in the dag as blocks', async () => {
      const root = dag[0]

      await pm.pinLocal(root)

      const pairs = await all(blocksDatastore.query({ prefix: `/${root.toString()}` }))

      assert.equal(pairs.length, Object.values(dag).length)

      for (const { key } of pairs) {
        assert(dag.find(b => b.equals(CID.parse(key.baseNamespace()))))
      }
    })

    it('pins the root', async () => {
      const root = dag[0]

      await pm.pinLocal(root)

      const isPinned = await components.helia.pins.isPinned(root)

      assert(isPinned)
    })

    it('emits pins:added event', async () => {
      const pin = data.pins[0]

      await all(components.helia.pins.add(pin.cid))

      const promise = new Promise<void>((resolve, reject) => {
        pm.events.addEventListener('pins:added', () => {
          resolve()
        })

        setTimeout(reject, 3000)
      })

      await pm.pinLocal(pin.cid)

      await promise
    })
  })

  describe('pin', () => {
    it('creates the pin row in a downloading state', async () => {
      const root = dag[0]

      await pm.pin(root)

      const raw = await pinsDatastore.get(new Key(root.toString()))
      const data = cborg.decode(raw)

      assert(data)
      assert.equal(data.status, 'DOWNLOADING')
    })

    it('adds the root as a download', async () => {
      const root = dag[0]

      await pm.pin(root)

      const downloads = await all(downloadsDatastore.query({ prefix: `/${root.toString()}` }))

      assert.equal(downloads.length, 1)
      assert(CID.parse(downloads[0].key.baseNamespace()).equals(root))
    })

    it('does nothing if the pin already exists', async () => {
      const root = dag[0]

      await createPins([{ cid: root, depth: 1, status: 'COMPLETED' }])
      await pm.pin(root)

      const downloads = await all(downloadsDatastore.query({ prefix: `/${root.toString()}` }))
      const pin = await pinsDatastore.get(new Key(root.toString()))

      assert.equal(downloads.length, 0)
      assert(pin)
    })

    it('emits pins:adding event', async () => {
      const root = dag[0]
      const promise = new Promise<void>((resolve, reject) => {
        pm.events.addEventListener('pins:adding', () => {
          resolve()
        })

        setTimeout(reject, 3000)
      })

      await pm.pin(root)

      await promise
    })
  })

  describe('getState', () => {
    it('returns the pins state', async () => {
      await Promise.all(
        [...(['DOWNLOADING', 'COMPLETED', 'DESTROYED', 'UPLOADING'] as const).entries()].map(async ([i, status]) => {
          await createPins([{ cid: dag[i], status, depth: DAG_DEPTH }])
          const gotState = await pm.getStatus(dag[i])

          assert.equal(gotState, status)
        })
      )
    })

    it("returns NOTFOUND if the pin doesn't exist", async () => {
      const root = dag[0]
      const state = await pm.getStatus(root)

      assert.equal(state, 'NOTFOUND')
    })
  })

  describe('getActiveDownloads', () => {
    it('returns only the pins in the DOWNLOADING state', async () => {
      await Promise.all(
        [...(['DOWNLOADING', 'COMPLETED', 'DESTROYED', 'UPLOADING'] as const).entries()].map(async ([i, status]) => {
          await createPins([{ cid: dag[i], status, depth: DAG_DEPTH }])
        })
      )

      const pins = await pm.getActiveDownloads()

      assert.equal(pins.length, 1)
      assert(pins[0].equals(dag[0]))
    })
  })

  describe('getHeads', () => {
    it('returns all the block downloads for a pin', async () => {
      await createDownloads(dag.map(c => ({
        cid: c,
        pinnedBy: dag[0],
        depth: DAG_DEPTH
      })))

      const heads = await pm.getHeads(dag[0])

      assert.equal(heads.length, dag.length)

      for (const head of heads) {
        assert(dag.map(d => d.toString()).includes(head.cid.toString()))
      }
    })

    it('returns no more than the limit', async () => {
      await createDownloads(dag.map(c => ({
        cid: c,
        pinnedBy: dag[0],
        depth: DAG_DEPTH
      })))

      const limit = 2
      const heads = await pm.getHeads(dag[0], { limit })

      assert.equal(heads.length, limit)
    })
  })

  describe('getSize', () => {
    it('returns the sum of the size of all the blocks under a pin', async () => {
      const sizePerBlock = 10

      await createBlocks(dag.map(c => ({
        cid: c,
        pinnedBy: dag[0],
        size: sizePerBlock,
        depth: 1
      })))

      const size = await pm.getSize(dag[0])

      assert.equal(size, dag.length * sizePerBlock)
    })
  })

  describe('getBlockCount', () => {
    it('returns the number of blocks under a pin', async () => {
      await createBlocks(dag.map(c => ({
        cid: c,
        pinnedBy: dag[0],
        size: 10,
        depth: 1
      })))

      const size = await pm.getBlockCount(dag[0])

      assert.equal(size, dag.length)
    })
  })

  describe('downloadSync', () => {
    it("throws an error if the pin doesn't exist", async () => {
      await assert.rejects(pm.downloadSync(dag[0]))
    })

    it('returns an empty array if it is in the COMPLETED state', async () => {
      await createPins([{
        cid: dag[0],
        status: 'COMPLETED',
        depth: DAG_DEPTH
      }])

      const downloaders = await pm.downloadSync(dag[0])

      assert.equal(downloaders.length, 0)
    })

    it('returns all the downloaders for a pin', async () => {
      await createPins([{
        cid: dag[0],
        status: 'DOWNLOADING',
        depth: DAG_DEPTH
      }])

      await createDownloads(dag.map(c => ({
        cid: c,
        pinnedBy: dag[0],
        size: 10,
        depth: 1
      })))

      const downloaders = await pm.downloadSync(dag[0])

      assert.equal(downloaders.length, dag.length)

      await Promise.all(downloaders.map(async downloader => {
        const blockInfo = await downloader()

        assert(dag.map(d => d.toString()).includes(blockInfo.cid.toString()))
      }))
    })
  })

  describe('downloadPin', () => {
    it("throws an error if the pin doesn't exist", async () => {
      await assert.rejects(all(pm.downloadPin(dag[0])))
    })

    it('returns an empty array if it is in the COMPLETED state', async () => {
      await createPins([{
        cid: dag[0],
        status: 'COMPLETED',
        depth: DAG_DEPTH
      }])

      const downloaders = await all(pm.downloadPin(dag[0]))

      assert.equal(downloaders.length, 0)
    })

    it('returns existing downloads for a pin first', async () => {
      await createPins([{
        cid: dag[0],
        status: 'DOWNLOADING',
        depth: DAG_DEPTH
      }])

      await createDownloads([{
        cid: dag[0],
        pinnedBy: dag[0],
        depth: 1
      }])

      const itr = pm.downloadPin(dag[0])
      const downloader = await itr.next()

      assert(downloader.done == null || !downloader.done)

      await downloader.value()

      const blocks = await all(blocksDatastore.query({}))
      const downloads = await all(downloadsDatastore.query({}))

      assert.equal(blocks.length, 1)
      assert.equal(downloads.length, DAG_WIDTH)
    })
  })
})
