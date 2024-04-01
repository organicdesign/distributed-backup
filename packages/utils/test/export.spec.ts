import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { fileURLToPath } from 'url'
import * as testData from '@organicdesign/db-test-utils/data'
import { MemoryBlockstore } from 'blockstore-core'
import all from 'it-all'
import { exporter } from '../src/portation/exporter.js'
import { importer } from '../src/portation/importer.js'

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
    for (const data of testData.files) {
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

    assert.equal(results.length, testData.files.length)

    for (const { cid, path } of results) {
      const dataFile = testData.getFile(path)

      assert(dataFile != null)

      const exportPath = dataFile.generatePath(outPath)

      await exporter(blockstore, exportPath, cid)
    }

    for (const data of testData.files) {
      const exportPath = data.generatePath(outPath)
      const valid = await data.validate(exportPath)

      assert.equal(valid, true)
    }
  })
})
