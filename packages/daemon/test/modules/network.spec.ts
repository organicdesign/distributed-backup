import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { unixfs } from '@helia/unixfs'
import { createNetClient } from '@organicdesign/net-rpc'
import { createHelia } from 'helia'
import { Key } from 'interface-datastore'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { mkTestPath } from '../utils/paths.js'
import type { Libp2p } from '@libp2p/interface'
import setup from '@/common/index.js'
import { Config, type Components } from '@/common/interface.js'
import createLibp2p from '@/common/libp2p.js'

describe('network', () => {
  const testPath = mkTestPath('network')
  const socket = Path.join(testPath, 'server.socket')

  beforeEach(async () => {
    await fs.mkdir(testPath, { recursive: true })
  })

  afterEach(async () => {
    await fs.rm(testPath, { recursive: true })
  })

  it('provides defaults for the config options', async () => {
    const components = await setup({ socket })
    const config = components.parseConfig(Config)

    assert.deepEqual(config.addresses, [
      '/ip4/127.0.0.1/tcp/0',
      '/ip4/127.0.0.1/tcp/0/ws'
    ])

    assert.deepEqual(config.bootstrap, [])
    assert.equal(config.private, false)
    assert.equal(config.serverMode, false)

    await components.stop()
  })

  it('uses the stores derived form base for helia', async () => {
    const components = await setup({ socket })
    const cid = CID.parse('QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ')

    assert(!(await components.helia.blockstore.has(cid)))

    await components.blockstore.put(cid, new Uint8Array())

    assert(await components.helia.blockstore.has(cid))

    assert(!(await components.helia.datastore.has(new Key('/test'))))

    await components.datastore.put(new Key('/helia/datastore/test'), new Uint8Array())

    assert(await components.helia.datastore.has(new Key('/test')))

    await components.stop()
  })

  it('is not connectable from outside when private is set to true', async () => {
    const components = await setup({ socket, config: { private: true } })
    const libp2p = await createLibp2p({})
    const mkSignal = (): AbortSignal => AbortSignal.timeout(1000)
    const dialTo = libp2p.dial(components.libp2p.getMultiaddrs(), { signal: mkSignal() })
    const dialFrom = components.libp2p.dial(libp2p.getMultiaddrs(), { signal: mkSignal() })

    await Promise.all([
      assert.rejects(async () => dialTo),
      assert.rejects(async () => dialFrom)
    ])

    await libp2p.stop()
    await components.stop()
  })

  it('is connectable from outside when private is set to false', async () => {
    const components = await setup({ socket, config: { private: false } })
    const [libp2p1, libp2p2] = await Promise.all([createLibp2p({}), createLibp2p({})])

    const mkSignal = (): AbortSignal => AbortSignal.timeout(1000)

    await Promise.all([
      libp2p1.dial(components.libp2p.getMultiaddrs(), { signal: mkSignal() }),
      components.libp2p.dial(libp2p2.getMultiaddrs(), { signal: mkSignal() })
    ])

    await Promise.all([
      libp2p1.stop(),
      libp2p2.stop(),
			components.stop()
    ])
  })

  it('is connectable from inside when private is set to true', async () => {
    const components = await setup({ socket, config: { private: true } })

    const create = async (): Promise<Libp2p> => createLibp2p({
      psk: components.keyManager.getPskKey()
    })

    const [libp2p1, libp2p2] = await Promise.all([create(), create()])

    const mkSignal = (): AbortSignal => AbortSignal.timeout(1000)

    await Promise.all([
      libp2p1.dial(components.libp2p.getMultiaddrs(), { signal: mkSignal() }),
      components.libp2p.dial(libp2p2.getMultiaddrs(), { signal: mkSignal() })
    ])

    await Promise.all([
      libp2p1.stop(),
      libp2p2.stop(),
      components.stop()
    ])
  })

  it('bootstraps when a bootstrap peer is set', async () => {
    const libp2p = await createLibp2p({})
    const components = await setup({
      socket,
      config: {
        private: false,
        bootstrap: libp2p.getMultiaddrs().map(a => a.toString())
      }
    })

    const peer = await new Promise<Uint8Array>((resolve, reject) => {
      setTimeout(() => { reject(new Error('timeout')) }, 5000)

      components.libp2p.addEventListener('peer:connect', (a) => {
        resolve(a.detail.toBytes())
      })
    })

    assert.deepEqual(peer, libp2p.peerId.toBytes())

    await libp2p.stop()
		await components.stop()
  })

  // Something is failing inside websockets...
  it.skip('relays when server mode is set', async () => {
    const [libp2p1, libp2p2] = await Promise.all([
      createLibp2p({ addresses: ['/ip4/127.0.0.1/tcp/0'] }),
      createLibp2p({ addresses: ['/ip4/127.0.0.1/tcp/0/ws'] })
    ])

    const components = await setup({
      socket,
      config: {
        private: false,
        serverMode: true
      }
    })

    await Promise.all([
      libp2p1.dial(components.libp2p.getMultiaddrs()),
      libp2p2.dial(components.libp2p.getMultiaddrs())
    ])

    await new Promise(resolve => setTimeout(resolve, 5000))

    await libp2p1.dial(libp2p2.getMultiaddrs())

    await Promise.all([
      libp2p1.stop(),
      libp2p2.stop(),
			components.stop()
    ])
  })

  it('libp2p remembers peers with persistant storage', async () => {
    const libp2p = await createLibp2p({})
    const start = async (): Promise<Components> => setup({ socket, config: { private: false, storage: testPath } })

    let components = await start()

    await libp2p.dial(components.libp2p.getMultiaddrs())

    const [peer] = components.libp2p.getPeers()

    await components.libp2p.peerStore.save(peer, peer)

    await components.stop()

    components = await start()

    const peers = await components.libp2p.peerStore.all()

    assert.deepEqual(peers[0].id.toBytes(), peer.toBytes())

    await components.stop()
    await libp2p.stop()
  })

  it('rpc - addresses returns the peers addresses', async () => {
    const components = await setup({ socket, config: { private: false } })
    const client = createNetClient(socket)
    const addresses = await client.rpc.request('addresses', {})

    assert.deepEqual(addresses, components.libp2p.getMultiaddrs().map(a => a.toString()))

    client.close()
    await components.stop()
  })

  it('rpc - connections returns the peers connections', async () => {
    const libp2p = await createLibp2p({})
    const components = await setup({ socket, config: { private: false } })
    const client = createNetClient(socket)

    assert.deepEqual(await client.rpc.request('connections', {}), [])

    await libp2p.dial(components.libp2p.getMultiaddrs())

    const connections = await client.rpc.request('connections', {})

    assert.equal(connections.length, 1)

    assert.deepEqual(
      connections,
      components.libp2p.getConnections().map(a => a.remoteAddr.toString())
    )

    await libp2p.stop()
    client.close()
    await components.stop()
  })

  it('rpc - connection connects to another peer', async () => {
    const libp2p = await createLibp2p({})
    const components = await setup({ socket, config: { private: false } })
    const client = createNetClient(socket)

    await client.rpc.request('connect', { address: libp2p.getMultiaddrs()[0] })

    const connections = components.libp2p.getConnections()

    assert.equal(connections.length, 1)
    assert.deepEqual(connections[0].remotePeer.toBytes(), libp2p.peerId.toBytes())

    await libp2p.stop()
		await components.stop()
    client.close()
  })

  // This should pass but sometimes github workflows can be a bit flakey in terms of peer discovery.
  it.skip('rpc - get peers returns a peer hosting content', async () => {
    const data = new Uint8Array([0, 1, 2, 3])
    const libp2p = await createLibp2p({})
    const helia = await createHelia({ libp2p })
    const ufs = unixfs(helia)
    const components = await setup({ socket, config: { private: false } })
    const client = createNetClient(socket)

    await components.libp2p.dial(helia.libp2p.getMultiaddrs())

    const cid = await ufs.addBytes(data)
    await all(helia.pins.add(cid))

    const result = await client.rpc.request('count-peers', { cids: [cid.toString()] })

    assert.deepEqual(result, [{ cid: cid.toString(), peers: 1 }])

    await helia.stop()
    await libp2p.stop()
		await components.stop()
    client.close()
  })
})
