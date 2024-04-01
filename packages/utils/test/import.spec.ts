import assert from 'assert/strict'
import * as testData from '@organicdesign/db-test-utils/data'
import { BlackHoleBlockstore } from 'blockstore-core/black-hole'
import all from 'it-all'
import { importer } from '../src/index.js'

const blockstore = new BlackHoleBlockstore()

describe('importer', () => {
  it('imports files ', async () => {
    for (const data of testData.files) {
      const [result] = await all(importer(
        blockstore,
        data.path
      ))

      const dataFile = testData.getFile(result.path)

      assert(dataFile != null)
      assert.deepEqual(result.cid, dataFile.cid)
      assert.deepEqual(result.path, dataFile.path)
      assert.deepEqual(result.size, dataFile.size)
    }
  })

  it('imports a directory ', async () => {
    const results = await all(importer(blockstore, testData.root))

    assert.equal(results.length, testData.files.length)

    for (const result of results) {
      const dataFile = testData.getFile(result.path)

      assert(dataFile != null)
      assert.deepEqual(result.cid, dataFile.cid)
      assert.deepEqual(result.path, dataFile.path)
      assert.deepEqual(result.size, dataFile.size)
    }
  })
})
