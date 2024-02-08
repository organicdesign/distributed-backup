import assert from 'assert/strict'
import Path from 'path'
import projectPath from './utils/project-path.js'
import runClient from './utils/run-client.js'
import runNode from './utils/run-node.js'

const node = 'revisions'
const testDataDir = Path.join(projectPath, 'e2e-tests/test-data/file-1.txt')
const virtualDir = '/data'

describe('revisions', () => {
  let proc: Awaited<ReturnType<typeof runNode>>
  let group: string

  before(async () => {
    proc = await runNode(node)

    await proc.start()

    group = (await runClient(node, 'create-group', 'test')).group

    const response = await runClient(node, 'import', group, testDataDir, virtualDir)

    assert(response.success)
  })

  after(async () => {
    await proc.stop()
  })

  it('has 1 revision after importing a file', async () => {
    const response = await runClient(node, 'revisions', group, virtualDir)

    assert(response)
    assert(Array.isArray(response))
    assert.equal(response.length, 1)
    assert.equal(response[0].sequence, 0)
  })

  it("has 1 revision after overwrite with strategy 'none'", async () => {
    const add = await runClient(node, 'import', group, testDataDir, virtualDir, '--revisionStrategy', 'none')

    assert(add.success)

    const response = await runClient(node, 'revisions', group, virtualDir)

    assert(response)
    assert(Array.isArray(response))
    assert.equal(response.length, 1)
    assert.equal(response[0].sequence, 1)
  })

  it("has 2 revisions after overwrite with strategy 'log'", async () => {
    const add = await runClient(node, 'import', group, testDataDir, virtualDir, '--revisionStrategy', 'log')

    assert(add.success)

    const response = await runClient(node, 'revisions', group, virtualDir)

    assert(response)
    assert(Array.isArray(response))
    assert.equal(response.length, 2)
    assert.equal(response[0].sequence, 1)
    assert.equal(response[1].sequence, 2)
  })

  it("has 3 revisions after overwrite with strategy 'all'", async () => {
    const add = await runClient(node, 'import', group, testDataDir, virtualDir, '--revisionStrategy', 'all')

    assert(add.success)

    const response = await runClient(node, 'revisions', group, virtualDir)

    assert(response)
    assert(Array.isArray(response))
    assert.equal(response.length, 3)
    assert.equal(response[0].sequence, 1)
    assert.equal(response[1].sequence, 2)
    assert.equal(response[2].sequence, 3)
  })

  it("reduces to 2 revisions after overwrite with strategy 'log'", async () => {
    const add = await runClient(node, 'import', group, testDataDir, virtualDir, '--revisionStrategy', 'log')

    assert(add.success)

    const response = await runClient(node, 'revisions', group, virtualDir)

    assert(response)
    assert(Array.isArray(response))
    assert.equal(response.length, 2)
    assert.equal(response[0].sequence, 1)
    assert.equal(response[1].sequence, 4)
  })

  it("reduces to 1 revision after overwrite with strategy 'none'", async () => {
    const add = await runClient(node, 'import', group, testDataDir, virtualDir, '--revisionStrategy', 'none')

    assert(add.success)

    const response = await runClient(node, 'revisions', group, virtualDir)

    assert(response)
    assert(Array.isArray(response))
    assert.equal(response.length, 1)
    assert.equal(response[0].sequence, 5)
  })
})
