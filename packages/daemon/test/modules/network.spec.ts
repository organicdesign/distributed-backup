import assert from 'assert/strict'
import fs from 'fs/promises'
import { Key } from 'interface-datastore'
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
  let components: NetworkComponents

  before(async () => {
    await fs.mkdir(testPath, { recursive: true })

    const sigint = await createSigint()
    const config = mockConfig({ storage: ':memory:' })
    const argv = mockArgv(testPath)
    const base = mockBase()
    const rpc = await createRpc({ argv, sigint })

    components = {
      sigint,
      config,
      base,
      rpc
    }
  })

  after(async () => {
    await fs.rm(testPath, { recursive: true })

    components.sigint.interupt()
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
    const config = mockConfig({ storage: ':memory:', private: true })

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
    const config = mockConfig({ storage: ':memory:', private: false })

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
    const config = mockConfig({ storage: ':memory:', private: true })

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
})
