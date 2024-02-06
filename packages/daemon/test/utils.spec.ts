import assert from 'assert/strict'
import { MemoryBlockstore } from 'blockstore-core'
import { createHelia, type Helia } from 'helia'
import { CID } from 'multiformats/cid'
import * as raw from 'multiformats/codecs/raw'
import { sha256 } from 'multiformats/hashes/sha2'
import { MEMORY_MAGIC } from '../src/interface.js'
import {
  isMemory,
  safePin,
  safeUnpin,
  safeReplace,
  encodeAny,
  decodeAny,
  walkDag,
  getDagSize
} from '../src/utils.js'
import { createDag } from './utils/dag.js'

describe('isMemory', () => {
  it('returns true if the memory magic is passed', () => {
    assert(isMemory(MEMORY_MAGIC))
  })

  it('returns false for any other value than the memory magic', () => {
    const values = [
      '/my/path',
      'my-directory',
      ':memory',
      'memory',
      'memory:',
      ':memory:/my-dir'
    ]

    for (const value of values) {
      assert(!isMemory(value))
    }
  })
})

describe('safe pinning', () => {
  const blockData = [
    new Uint8Array([]),
    new Uint8Array([0, 1, 2, 3]),
    new Uint8Array([255, 255, 255, 255])
  ]

  let cids: CID[]
  let helia: Helia

  beforeEach(async () => {
    helia = await createHelia()
    cids = []

    for (const data of blockData) {
      const digest = await sha256.digest(data)
      const cid = CID.createV1(raw.code, digest)

      await helia.blockstore.put(cid, data)

      cids.push(cid)
    }
  })

  afterEach(async () => {
    await helia.stop()
  })

  it('safePin pins cids', async () => {
    await Promise.all(cids.map(async cid => safePin(helia, cid)))

    for (const cid of cids) {
      assert(await helia.pins.isPinned(cid))
    }
  })

  it('safePin does not throw if the cid is already pinned', async () => {
    await Promise.all(cids.map(cid => helia.pins.add(cid)))
    await Promise.all(cids.map(async cid => safePin(helia, cid)))

    for (const cid of cids) {
      assert(await helia.pins.isPinned(cid))
    }
  })

  it('safeUnpin unpins a cid', async () => {
    await Promise.all(cids.map(cid => helia.pins.add(cid)))
    await Promise.all(cids.map(async cid => safeUnpin(helia, cid)))

    for (const cid of cids) {
      assert(!await helia.pins.isPinned(cid))
    }
  })

  it('safeUnpin does not throw an error if the cid is not pinned', async () => {
    await Promise.all(cids.map(async cid => safeUnpin(helia, cid)))

    for (const cid of cids) {
      assert(!await helia.pins.isPinned(cid))
    }
  })

  it('safeReplace replaces a cid with another', async () => {
    const rCid = cids.pop()

    await Promise.all(cids.map(cid => helia.pins.add(cid)))

    assert(rCid)

    await Promise.all(cids.map(async cid => safeReplace(helia, cid, rCid)))

    for (const cid of cids) {
      assert(!await helia.pins.isPinned(cid))
    }

    assert(await helia.pins.isPinned(rCid))
  })

  it('safeReplace does not throw an error if the replaced cid is not pinned', async () => {
    const rCid = cids.pop()

    assert(rCid)

    await Promise.all(cids.map(async cid => safeReplace(helia, cid, rCid)))

    for (const cid of cids) {
      assert(!await helia.pins.isPinned(cid))
    }

    assert(await helia.pins.isPinned(rCid))
  })
})

describe('cbor encoding and decoding', () => {
  const data = [
    {
      decoded: new Uint8Array([0, 1, 2, 3]),
      encoded: new Uint8Array([68, 0, 1, 2, 3])
    },

    {
      decoded: 'str',
      encoded: new Uint8Array([99, 115, 116, 114])
    },

    {
      decoded: 9999,
      encoded: new Uint8Array([25, 39, 15])
    },

    {
      decoded: [{ test: 'value' }],
      encoded: new Uint8Array([129, 161, 100, 116, 101, 115, 116, 101, 118, 97, 108, 117, 101])
    }
  ]

  it('encodes any data', () => {
    for (const { encoded, decoded } of data) {
      assert.deepEqual(encoded, encodeAny(decoded))
    }
  })

  it('decodes any data', () => {
    for (const { encoded, decoded } of data) {
      assert.deepEqual(decodeAny(encoded), decoded)
    }
  })
})

describe('walkDag', () => {
  let dag: CID[]
  let blockstore: MemoryBlockstore

  before(async () => {
    blockstore = new MemoryBlockstore()

    dag = await createDag({ blockstore }, 3, 3)
  })

  it('walks over every value of the dag', async () => {
    let count = 0

    for await (const getData of walkDag(blockstore, dag[0])) {
      const data = await getData()

      assert(dag.find(cid => cid.equals(data.cid)))

      count++
    }

    assert.equal(count, dag.length)
  })
})

describe('getDagSize', () => {
  let dag: CID[]
  let blockstore: MemoryBlockstore

  before(async () => {
    blockstore = new MemoryBlockstore()

    dag = await createDag({ blockstore }, 3, 3)
  })

  it('returns the correct block count for the dag', async () => {
    const { blocks } = await getDagSize(blockstore, dag[0])

    assert.equal(blocks, dag.length)
  })

  it('returns the correct size for the dag', async () => {
    const blocks = await Promise.all(dag.map(async cid => blockstore.get(cid)))
    const totalSize = blocks.reduce((p, c) => p + c.length, 0)
    const { size } = await getDagSize(blockstore, dag[0])

    assert.equal(size, totalSize)
  })
})
