import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import * as testData from '@organicdesign/db-test-utils'
import projectPath from './utils/project-path.js'
import runClient from './utils/run-client.js'
import runNode from './utils/run-node.js'

const node = 'import-export'
const outPath = Path.join(projectPath, 'packages/e2e-tests/test-data-out')

describe('import/export', () => {
  let proc: Awaited<ReturnType<typeof runNode>>
  let group: string

  before(async () => {
    proc = await runNode(node)

    await proc.start()

    group = (await runClient(node, 'create-group', 'test')).group

    await fs.mkdir(outPath, { recursive: true })
    await fs.rm(outPath, { recursive: true })
    await fs.mkdir(outPath)
  })

  beforeEach(async () => {
  })

  after(async () => {
    await proc.stop()
    await fs.rm(outPath, { recursive: true })
  })

  it('imports a file', async () => {
    for (const data of testData.data) {
      const virtual = data.generatePath('/test-import-file')
      const response = await runClient(node, 'import', group, data.path, virtual)

      assert.deepEqual(response, {
        success: true,
        imports: [
          {
            cid: data.cid.toString(),
            path: virtual,
            inPath: data.path
          }
        ]
      })
    }
  })

  it('imports a directory', async () => {
    const virtual = '/test-import-directory'
    const response = await runClient(node, 'import', group, testData.root, virtual)

    assert.equal(response.success, true)
    assert(Array.isArray(response.imports))
    assert.equal(response.imports.length, testData.data.length)

    for (const file of response.imports) {
      const dataFile = testData.getDataFile(file.inPath)

      assert(dataFile != null)
      assert.equal(file.cid, dataFile.cid.toString())
      assert.equal(file.path, dataFile.generatePath(virtual))
      assert.equal(file.inPath, dataFile.path)
    }
  })

  it('exports a file', async () => {
    for (const data of testData.data) {
      const virtual = data.generatePath('/test-import-file')
      const exportPath = data.generatePath(outPath)
      const response = await runClient(node, 'export', group, virtual, exportPath)

      assert.deepEqual(response, { success: true })

      const valid = await data.validate(exportPath)

      assert.equal(valid, true)
    }
  })

  it('exports a directory', async () => {
    const virtual = '/test-import-directory'
    const response = await runClient(node, 'export', group, virtual, outPath)

    assert.deepEqual(response, {
      success: true
    })

    for (const data of testData.data) {
      const exportDir = data.generatePath(outPath)
      const valid = await data.validate(exportDir)

      assert.equal(valid, true)
    }
  })
})
