import assert from 'assert/strict'
import * as testData from '@organicdesign/db-test-utils'
import runClient from './utils/run-client.js'
import runNode from './utils/run-node.js'

const nodes = ['synchronization-peer-a', 'synchronization-peer-b'] as const

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

    const addRes = await runClient(
      nodes[0],
      'import',
      group,
      testData.data[0].path,
      virtualPath
    )

    assert(addRes.success)

    const joinRes = await runClient(nodes[1], 'join-group', group)

    assert(joinRes.success)

    // Ensure it syncs...
    const sync = await runClient(nodes[1], 'sync')

    assert(sync.success)

    const listRes = await runClient(nodes[1], 'list')

    assert(listRes)
    assert.equal(typeof listRes, 'object')
    assert(listRes.items)
    assert(listRes.total)
    assert(Array.isArray(listRes.items))
    assert.equal(listRes.items.length, 1)
    assert.equal(listRes.items[0].cid, addRes.imports[0].cid)
    assert.equal(listRes.items[0].group, group)
    assert.equal(listRes.items[0].path, virtualPath)
  })

  it('syncs a new file', async () => {
    const virtualPath = '/file-2'

    const addRes = await runClient(
      nodes[0],
      'import',
      group,
      testData.data[1].path,
      virtualPath
    )

    assert(addRes.success)

    // Ensure it syncs...
    const sync = await runClient(nodes[1], 'sync')

    assert(sync.success)

    const listRes = await runClient(nodes[1], 'list')

    assert(listRes)
    assert.equal(typeof listRes, 'object')
    assert(listRes.items)
    assert(listRes.total)
    assert(Array.isArray(listRes.items))
    assert.equal(listRes.items.length, 2)

    const item = listRes.items.find((i: { cid: string }) => i.cid === addRes.imports[0].cid)

    assert(item)
    assert.equal(item.group, group)
    assert.equal(item.path, virtualPath)
  })
})
