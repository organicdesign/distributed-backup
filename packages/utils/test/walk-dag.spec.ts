import assert from 'assert/strict'
import { createDag } from '@organicdesign/db-test-utils'
import { MemoryBlockstore } from 'blockstore-core'
import { walkDag } from '../src/dag-walkers/index.js'
import type { CID } from 'multiformats/cid'

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
