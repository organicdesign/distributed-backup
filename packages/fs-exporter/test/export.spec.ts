import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { fileURLToPath } from 'url'
import { importer } from '@organicdesign/db-fs-importer'
import * as testData from '@organicdesign/db-test-data'
import { MemoryBlockstore } from 'blockstore-core'
import all from 'it-all'
import { exporter } from '../src/index.js'

const outPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../test-data-out')

const blockstore = new MemoryBlockstore()

describe('exporter', () => {
  beforeEach(async () => {
    await fs.mkdir(outPath, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(outPath, { recursive: true })
  })

  it('exports files ', async () => {
    for (const data of testData.data) {
      const [{ cid }] = await all(importer(
        blockstore,
        data.path
      ))

      const exportPath = data.generatePath(outPath)

      await exporter(blockstore, exportPath, cid)

      const valid = await data.validate(exportPath)

      assert.equal(valid, true)
    }
  })

  it('exports a directory ', async () => {
    const results = await all(importer(
      blockstore,
      testData.root
    ))

    assert.equal(results.length, testData.data.length)

    for (const { cid, path } of results) {
      const dataFile = testData.getDataFile(path)

      assert(dataFile != null)

      const exportPath = dataFile.generatePath(outPath)

      await exporter(blockstore, exportPath, cid)
    }

    for (const data of testData.data) {
      const exportPath = data.generatePath(outPath)
      const valid = await data.validate(exportPath)

      assert.equal(valid, true)
    }
  })
})
