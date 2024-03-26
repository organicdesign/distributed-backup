import assert from 'assert/strict'
import * as testData from '@organicdesign/db-test-data'
import { BlackHoleBlockstore } from 'blockstore-core/black-hole'
import all from 'it-all'
import { importer } from '../src/index.js'

const blockstore = new BlackHoleBlockstore()

describe('importer', () => {
  it('imports files ', async () => {
    for (const data of testData.data) {
      const [result] = await all(importer(
        blockstore,
        data.path
      ))

      const dataFile = testData.getDataFile(result.path)

      assert(dataFile != null)
      assert.deepEqual(result.cid, dataFile.cid)
      assert.deepEqual(result.path, dataFile.path)
      assert.deepEqual(result.size, dataFile.size)
    }
  })

  it('imports a directory ', async () => {
    const results = await all(importer(blockstore, testData.root))

    assert.equal(results.length, testData.data.length)

    for (const result of results) {
      const dataFile = testData.getDataFile(result.path)

      assert(dataFile != null)
      assert.deepEqual(result.cid, dataFile.cid)
      assert.deepEqual(result.path, dataFile.path)
      assert.deepEqual(result.size, dataFile.size)
    }
  })
})
