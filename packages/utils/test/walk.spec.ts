import assert from 'assert/strict'
import { createDag } from '@organicdesign/db-test-utils'
import { MemoryBlockstore } from 'blockstore-core'
import all from 'it-all'
import parallel from 'it-parallel'
import { pipe } from 'it-pipe'
import { type CID } from 'multiformats/cid'
import { walk } from '../src/dag/index.js'

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

      assert(dag.find(cid => cid.equals(data.cid)) != null)

      count++
    }

    assert.equal(count, dag.length)
  })

  it('throws an error if the blockstore is missing an item and local is set', async () => {
    const partialBlockstore = new MemoryBlockstore()
    const dag = await createDag({ blockstore: partialBlockstore }, 3, 3)

    await partialBlockstore.delete(dag[1])

    await assert.rejects(async () => all(pipe(walk(partialBlockstore, dag[0], { local: true }), parallel)))
  })
})
