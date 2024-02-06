import assert from 'assert/strict'
import runClient from './utils/run-client.js'
import runNode from './utils/run-node.js'

const nodes = ['connectivity-peer-a', 'connectivity-peer-b'] as const

describe('connectivity', () => {
  let proc: Array<Awaited<ReturnType<typeof runNode>>>

  before(async () => {
    proc = await Promise.all(nodes.map(runNode))

    await Promise.all(proc.map(async p => p.start()))
  })

  after(async () => {
    await Promise.all(proc.map(async p => p.stop()))
  })

  it('dispalys a tcp address', async () => {
    const data: string[] = await runClient(nodes[0], 'addresses')
    const tcp = data.find(d => d.startsWith('/ip4/127.0.0.1/tcp'))

    assert(tcp)
  })

  it('displays no connections on startup', async () => {
    const data = await runClient(nodes[0], 'connections')

    assert.deepEqual(data, [])
  })

  it('can connect to another node over tcp', async () => {
    const peerAData: string[] = await runClient(nodes[0], 'addresses')
    const tcp = peerAData.find(d => d.startsWith('/ip4/127.0.0.1/tcp'))

    assert(tcp)

    const peerBData = await runClient(nodes[1], 'connect', tcp)

    assert.deepEqual(peerBData, { success: true })
  })

  it('shows the connection on both nodes', async () => {
    await Promise.all(nodes.map(async node => {
      const data: string[] = await runClient(node, 'connections')

      assert(Array.isArray(data))
      assert.equal(data.length, 1)
    }))
  })
})
