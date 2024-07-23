import assert from 'assert/strict'
import * as testData from '@organicdesign/db-test-utils/data'
import runClient from './utils/run-client.js'
import runNode from './utils/run-node.js'

const node = 'revisions'
const virtualDir = '/data'
const dataFile = testData.files[0]

describe('revisions', () => {
  let proc: Awaited<ReturnType<typeof runNode>>
  let group: string

  before(async () => {
    proc = await runNode(node)

    await proc.start()

    group = (await runClient(node, 'create-group', 'test')).group

    const response = await runClient(node, 'import', group, dataFile.path, virtualDir)

    assert(response.success === true)
  })

  after(async () => {
    await proc.stop()
  })

  it('has 1 revision after importing a file', async () => {
    const response = await runClient(node, 'revisions', group, virtualDir)

    assert(response != null)
    assert(Array.isArray(response))
    assert.equal(response.length, 1)
    assert.equal(response[0].sequence, 0)
  })

  it("has 0 revisions after overwrite with strategy 'none'", async () => {
    const add = await runClient(node, 'import', group, dataFile.path, virtualDir, '--revisionStrategy', 'none')

    assert(add.success === true)

    const response = await runClient(node, 'revisions', group, virtualDir)

    await new Promise(resolve => setTimeout(resolve, 3000))

    assert(response != null)
    assert(Array.isArray(response))
    assert.equal(response.length, 0)
    // assert.equal(response[0].sequence, 1)
  })

  it("has 1 revisions after overwrite with strategy 'log'", async () => {
    const add = await runClient(node, 'import', group, dataFile.path, virtualDir, '--revisionStrategy', 'log')

    assert(add.success === true)

    const response = await runClient(node, 'revisions', group, virtualDir)

    assert(response != null)
    assert(Array.isArray(response))
    assert.equal(response.length, 1)
    assert.equal(response[0].sequence, 2)
  })

  it("has 2 revisions after overwrite with strategy 'all'", async () => {
    const add = await runClient(node, 'import', group, dataFile.path, virtualDir, '--revisionStrategy', 'all')

    assert(add.success === true)

    const response = await runClient(node, 'revisions', group, virtualDir)

    assert(response != null)
    assert(Array.isArray(response))
    assert.equal(response.length, 2)
    assert.equal(response[0].sequence, 2)
    assert.equal(response[1].sequence, 3)
  })

  it("reduces to 1 revision after overwrite with strategy 'log'", async () => {
    const add = await runClient(node, 'import', group, dataFile.path, virtualDir, '--revisionStrategy', 'log')

    assert(add.success === true)

    const response = await runClient(node, 'revisions', group, virtualDir)

    assert(response != null)
    assert(Array.isArray(response))
    assert.equal(response.length, 1)
    assert.equal(response[0].sequence, 2)
  })

  it("reduces to 0 revisions after overwrite with strategy 'none'", async () => {
    const add = await runClient(node, 'import', group, dataFile.path, virtualDir, '--revisionStrategy', 'none')

    assert(add.success === true)

    const response = await runClient(node, 'revisions', group, virtualDir)

    assert(response != null)
    assert(Array.isArray(response))
    assert.equal(response.length, 0)
  })
})
