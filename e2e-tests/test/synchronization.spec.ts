import assert from 'assert/strict'
import Path from 'path'
import projectPath from './utils/project-path.js'
import runClient from './utils/run-client.js'
import runNode from './utils/run-node.js'

const nodes = ['synchronization-peer-a', 'synchronization-peer-b'] as const

const files = [
  Path.join(projectPath, 'e2e-tests/test-data/file-1.txt'),
  Path.join(projectPath, 'e2e-tests/test-data/file-2.txt')
] as const

describe('synchronization', () => {
  let proc: Array<Awaited<ReturnType<typeof runNode>>>
  let group: string

  before(async () => {
    proc = await Promise.all(nodes.map(runNode))

    await Promise.all(proc.map(async p => p.start()))

    const data: string[] = await runClient(nodes[0], 'addresses')
    const tcp = data.find(d => d.startsWith('/ip4/127.0.0.1/tcp'))

    group = (await runClient(nodes[0], 'create-group', 'test')).group

    assert(tcp)

    for (let i = 1; i < nodes.length; i++) {
      const response = await runClient(nodes[i], 'connect', tcp)

      assert(response.success)
    }
  })

  after(async () => {
    await Promise.all(proc.map(async p => p.stop()))
  })

  it('syncs a pre-existing file', async () => {
    const virtualPath = '/file-1'
    const addRes = await runClient(nodes[0], 'add', group, files[0], virtualPath)

    assert(addRes.success)

    const joinRes = await runClient(nodes[1], 'join-group', group)

    assert(joinRes.success)

    // Give it a couple seconds to sync.
    await new Promise(resolve => setTimeout(resolve, 8000))

    const listRes = await runClient(nodes[1], 'list')

    assert(listRes)
    assert.equal(typeof listRes, 'object')
    assert(listRes.items)
    assert(listRes.total)
    assert(listRes.completed)
    assert(Array.isArray(listRes.items))
    assert.equal(listRes.items.length, 1)
    assert.equal(listRes.items[0].cid, addRes.imports[0].cid)
    assert.equal(listRes.items[0].group, group)
    assert.equal(listRes.items[0].path, virtualPath)
  })

  it('syncs a new file', async () => {
    const virtualPath = '/file-2'
    const addRes = await runClient(nodes[0], 'add', group, files[1], virtualPath)

    assert(addRes.success)

    // Give it a couple seconds to sync.
    await new Promise(resolve => setTimeout(resolve, 8000))

    const listRes = await runClient(nodes[1], 'list')

    assert(listRes)
    assert.equal(typeof listRes, 'object')
    assert(listRes.items)
    assert(listRes.total)
    assert(listRes.completed)
    assert(Array.isArray(listRes.items))
    assert.equal(listRes.items.length, 2)

    const item = listRes.items.find((i: { cid: string }) => i.cid === addRes.imports[0].cid)

    assert(item)
    assert.equal(item.group, group)
    assert.equal(item.path, virtualPath)
  })
})
