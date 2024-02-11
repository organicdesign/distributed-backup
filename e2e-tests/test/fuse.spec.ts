import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import projectPath from './utils/project-path.js'
import runClient from './utils/run-client.js'
import runFuse from './utils/run-fuse.js'
import runNode from './utils/run-node.js'

const node = 'fuse'
const testDataDir = Path.join(projectPath, 'e2e-tests/test-data')
const fuseDir = Path.join(projectPath, 'e2e-tests/fuse')

describe('fuse', () => {
  let daemonProc: Awaited<ReturnType<typeof runNode>>
  let fuseProc: Awaited<ReturnType<typeof runFuse>>
  let group: string

  before(async () => {
    daemonProc = await runNode(node)

    await daemonProc.start()

    group = (await runClient(node, 'create-group', 'test')).group

    await runClient(node, 'import', group, testDataDir, '/')

    fuseProc = await runFuse(node, fuseDir, group)

    await fuseProc.start()
  })

  after(async () => {
    await fuseProc.stop()
    await daemonProc.stop()
  })

  it('displays the hierachy', async () => {
    const [fuseFiles, sourceFiles] = await Promise.all([
      fs.readdir(Path.join(fuseDir, 'test-data'), { recursive: true }),
      fs.readdir(testDataDir, { recursive: true })
    ])

    assert.deepEqual(sourceFiles, fuseFiles)
  })
})
