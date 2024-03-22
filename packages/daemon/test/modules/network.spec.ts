import assert from 'assert/strict'
import fs from 'fs/promises'
import { unixfs } from '@helia/unixfs'
import { createNetClient } from '@organicdesign/net-rpc'
import { createHelia } from 'helia'
import { Key } from 'interface-datastore'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import network from '../../src/modules/network/index.js'
import createRpc from '../../src/modules/rpc/index.js'
import createSigint from '../../src/modules/sigint/index.js'
import { mkTestPath } from '../utils/paths.js'
import mockArgv from './mock-argv.js'
import mockBase from './mock-base.js'
import mockConfig from './mock-config.js'
import type { Requires as NetworkComponents } from '../../src/modules/network/index.js'
import type { Libp2p } from '@libp2p/interface'
import createLibp2p from '@/modules/network/libp2p.js'

describe('network', () => {
  const testPath = mkTestPath('network')
  let components: NetworkComponents & { argv: ReturnType<typeof mockArgv> }

  before(async () => {
    await fs.mkdir(testPath, { recursive: true })

    const sigint = await createSigint()
    const config = mockConfig({ storage: ':memory:' })
    const argv = mockArgv(testPath)
    const base = mockBase()
    const rpc = await createRpc({ argv, sigint })

    components = {
      argv,
      sigint,
      config,
      base,
      rpc
    }
  })

  after(async () => {
    await components.sigint.interupt()
    await new Promise(resolve => setTimeout(resolve, 1000))
    await fs.rm(testPath, { recursive: true })
  })

  it('provides defaults for the config options', async () => {
    const m = await network(components)

    assert.deepEqual(m.config.addresses, [
      '/ip4/127.0.0.1/tcp/0',
      '/ip4/127.0.0.1/tcp/0/ws'
    ])

    assert.deepEqual(m.config.bootstrap, [])
    assert.equal(m.config.private, false)
    assert.equal(m.config.serverMode, false)
  })

  it('uses the stores derived form base for helia', async () => {
    const m = await network(components)
    const cid = CID.parse('QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ')

    assert(!(await m.helia.blockstore.has(cid)))

    await components.base.blockstore.put(cid, new Uint8Array())

    assert(await m.helia.blockstore.has(cid))

    assert(!(await m.helia.datastore.has(new Key('/test'))))

    await components.base.datastore.put(new Key('/helia/datastore/test'), new Uint8Array())

    assert(await m.helia.datastore.has(new Key('/test')))
  })

  it('is not connectable from outside when private is set to true', async () => {
    const config = mockConfig({ private: true })

    const m = await network({
      ...components,
      config
    })

    const libp2p = await createLibp2p({})

    const mkSignal = (): AbortSignal => AbortSignal.timeout(1000)

    const dialTo = libp2p.dial(m.libp2p.getMultiaddrs(), { signal: mkSignal() })
    const dialFrom = m.libp2p.dial(libp2p.getMultiaddrs(), { signal: mkSignal() })

    await Promise.all([
      assert.rejects(async () => dialTo),
      assert.rejects(async () => dialFrom)
    ])

    await libp2p.stop()
  })

  it('is connectable from outside when private is set to false', async () => {
    const config = mockConfig({ private: false })

    const m = await network({
      ...components,
      config
    })

    const [libp2p1, libp2p2] = await Promise.all([createLibp2p({}), createLibp2p({})])

    const mkSignal = (): AbortSignal => AbortSignal.timeout(1000)

    await Promise.all([
      libp2p1.dial(m.libp2p.getMultiaddrs(), { signal: mkSignal() }),
      m.libp2p.dial(libp2p2.getMultiaddrs(), { signal: mkSignal() })
    ])

    await Promise.all([
      libp2p1.stop(),
      libp2p2.stop()
    ])
  })

  it('is connectable from inside when private is set to true', async () => {
    const config = mockConfig({ private: true })

    const m = await network({
      ...components,
      config
    })

    const create = async (): Promise<Libp2p> => createLibp2p({
      psk: components.base.keyManager.getPskKey()
    })

    const [libp2p1, libp2p2] = await Promise.all([create(), create()])

    const mkSignal = (): AbortSignal => AbortSignal.timeout(1000)

    await Promise.all([
      libp2p1.dial(m.libp2p.getMultiaddrs(), { signal: mkSignal() }),
      m.libp2p.dial(libp2p2.getMultiaddrs(), { signal: mkSignal() })
    ])

    await Promise.all([
      libp2p1.stop(),
      libp2p2.stop()
    ])
  })

  it('bootstraps when a bootstrap peer is set', async () => {
    const libp2p = await createLibp2p({})

    const config = mockConfig({
      private: false,
      bootstrap: libp2p.getMultiaddrs().map(a => a.toString())
    })

    const m = await network({
      ...components,
      config
    })

    const peer = await new Promise<Uint8Array>((resolve, reject) => {
      setTimeout(() => { reject(new Error('timeout')) }, 5000)

      m.libp2p.addEventListener('peer:connect', (a) => {
        resolve(a.detail.toBytes())
      })
    })

    assert.deepEqual(peer, libp2p.peerId.toBytes())

    await libp2p.stop()
  })

  // Something is failing inside websockets...
  it.skip('relays when server mode is set', async () => {
    const [libp2p1, libp2p2] = await Promise.all([
      createLibp2p({ addresses: ['/ip4/127.0.0.1/tcp/0'] }),
      createLibp2p({ addresses: ['/ip4/127.0.0.1/tcp/0/ws'] })
    ])

    const m = await network({
      ...components,
      config: mockConfig({
        private: false,
        serverMode: true
      })
    })

    await Promise.all([
      libp2p1.dial(m.libp2p.getMultiaddrs()),
      libp2p2.dial(m.libp2p.getMultiaddrs())
    ])

    await new Promise(resolve => setTimeout(resolve, 5000))

    await libp2p1.dial(libp2p2.getMultiaddrs())

    await Promise.all([
      libp2p1.stop(),
      libp2p2.stop()
    ])
  })

  it('libp2p remembers peers with persistant storage', async () => {
    const libp2p = await createLibp2p({})
    const sigints = await Promise.all([createSigint(), createSigint()])

    const create = async (index: number): ReturnType<typeof network> => network({
      ...components,

      sigint: sigints[index],

      base: mockBase({ path: testPath }),

      config: mockConfig({
        private: false
      })
    })

    const m1 = await create(0)

    await libp2p.dial(m1.libp2p.getMultiaddrs())

    const [peer] = m1.libp2p.getPeers()

    await m1.libp2p.peerStore.save(peer, peer)

    await sigints[0].interupt()

    const m2 = await create(1)

    const peers = await m2.libp2p.peerStore.all()

    assert.deepEqual(peers[0].id.toBytes(), peer.toBytes())

    await sigints[1].interupt()
    await libp2p.stop()
  })

  it('rpc - addresses returns the peers addresses', async () => {
    const m = await network(components)
    const client = createNetClient(components.argv.socket)
    const addresses = await client.rpc.request('addresses', {})

    assert.deepEqual(addresses, m.libp2p.getMultiaddrs().map(a => a.toString()))

    client.close()
  })

  it('rpc - connections returns the peers connections', async () => {
    const libp2p = await createLibp2p({})
    const m = await network(components)
    const client = createNetClient(components.argv.socket)

    assert.deepEqual(await client.rpc.request('connections', {}), [])

    await libp2p.dial(m.libp2p.getMultiaddrs())

    const connections = await client.rpc.request('connections', {})

    assert.equal(connections.length, 1)

    assert.deepEqual(
      connections,
      m.libp2p.getConnections().map(a => a.remoteAddr.toString())
    )

    await libp2p.stop()
    client.close()
  })

  it('rpc - connection connects to another peer', async () => {
    const libp2p = await createLibp2p({})
    const m = await network(components)
    const client = createNetClient(components.argv.socket)

    await client.rpc.request('connect', { address: libp2p.getMultiaddrs()[0] })

    const connections = m.libp2p.getConnections()

    assert.equal(connections.length, 1)
    assert.deepEqual(connections[0].remotePeer.toBytes(), libp2p.peerId.toBytes())

    await libp2p.stop()
    client.close()
  })

  // This should pass but sometimes github workflows can be a bit flakey in terms of peer discovery.
  it.skip('rpc - get peers returns a peer hosting content', async () => {
    const data = new Uint8Array([0, 1, 2, 3])
    const libp2p = await createLibp2p({})
    const helia = await createHelia({ libp2p })
    const ufs = unixfs(helia)
    const m = await network(components)
    const client = createNetClient(components.argv.socket)

    await m.libp2p.dial(helia.libp2p.getMultiaddrs())

    const cid = await ufs.addBytes(data)
    await all(helia.pins.add(cid))

    const result = await client.rpc.request('count-peers', { cids: [cid.toString()] })

    assert.deepEqual(result, [{ cid: cid.toString(), peers: 1 }])

    await helia.stop()
    await libp2p.stop()
    client.close()
  })
})
