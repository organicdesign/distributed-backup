import assert from 'assert/strict'
import runClient from './utils/run-client.js'
import runNode from './utils/run-node.js'

const nodes = ['group-peer-a', 'group-peer-b'] as const

const GROUP = 'bafyreidv23vfxp5ntctw3wr7j4rvbyvzyg7fnze4iznjmdwhezp4a3gozy'

describe('group', () => {
  let proc: Array<Awaited<ReturnType<typeof runNode>>>

  before(async () => {
    proc = await Promise.all(nodes.map(runNode))

    await Promise.all(proc.map(async p => p.start()))
  })

  after(async () => {
    await Promise.all(proc.map(async p => p.stop()))
  })

  it('lists no groups', async () => {
    const data = await runClient(nodes[0], 'list-groups')

    assert.deepEqual(data, [])
  })

  it('creates a group', async () => {
    const data = await runClient(nodes[0], 'create-group', 'test-group')

    assert.deepEqual(data, { group: GROUP })
  })

  it('lists the created group', async () => {
    const data = await runClient(nodes[0], 'list-groups')

    assert.deepEqual(data, [{
      // count: 0,
      // peers: 1,
      group: GROUP,
      name: 'test-group'
    }])
  })

  it('joins a group', async () => {
    // Connect the nodes.
    const peerAData: string[] = await runClient(nodes[0], 'addresses')
    const tcp = peerAData.find(d => d.startsWith('/ip4/127.0.0.1/tcp'))

    assert(tcp != null)

    const peerBData = await runClient(nodes[1], 'connect', tcp)

    assert.deepEqual(peerBData, { success: true })

    // Joins the group.
    const joinData = await runClient(nodes[1], 'join-group', GROUP)

    assert.deepEqual(joinData, { success: true })
  })

  it('lists the joined group', async () => {
    const data = await runClient(nodes[1], 'list-groups')

    assert.deepEqual(data, [{
      // count: 0,
      // peers: 2,
      group: GROUP,
      name: 'test-group'
    }])
  })
})
