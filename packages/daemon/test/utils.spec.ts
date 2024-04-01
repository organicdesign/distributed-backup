import assert from 'assert/strict'
import { createDag } from '@organicdesign/db-test-utils'
import { MemoryBlockstore } from 'blockstore-core'
import * as cborg from 'cborg'
import { type CID } from 'multiformats/cid'
import { getDagSize } from '@/modules/filesystem/utils.js'

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
      assert.deepEqual(encoded, cborg.encode(decoded))
    }
  })

  it('decodes any data', () => {
    for (const { encoded, decoded } of data) {
      assert.deepEqual(cborg.decode(encoded), decoded)
    }
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
