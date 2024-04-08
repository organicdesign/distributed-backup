import assert from 'assert/strict'
import { createDag } from '@organicdesign/db-test-utils'
import { MemoryBlockstore } from 'blockstore-core'
import { type CID } from 'multiformats/cid'
import { getSize } from '../src/dag/index.js'

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
