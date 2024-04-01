import assert from 'assert/strict'
import { createDag } from '@organicdesign/db-test-utils'
import { MemoryBlockstore } from 'blockstore-core'
import { type CID } from 'multiformats/cid'
import { getSize, walk } from '../src/dag/index.js'

describe('getDagSize', () => {
  let dag: CID[]
  let blockstore: MemoryBlockstore

  before(async () => {
    blockstore = new MemoryBlockstore()

    dag = await createDag({ blockstore }, 3, 3)
  })

  it('returns the correct block count for the dag', async () => {
    const { blocks } = await getSize(blockstore, dag[0])

    assert.equal(blocks, dag.length)
  })

  it('returns the correct size for the dag', async () => {
    const blocks = await Promise.all(dag.map(async cid => blockstore.get(cid)))
    const totalSize = blocks.reduce((p, c) => p + c.length, 0)
    const { size } = await getSize(blockstore, dag[0])

    assert.equal(size, totalSize)
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

    for await (const getData of walk(blockstore, dag[0])) {
      const data = await getData()

      assert(dag.find(cid => cid.equals(data.cid)))

      count++
    }

    assert.equal(count, dag.length)
  })
})
