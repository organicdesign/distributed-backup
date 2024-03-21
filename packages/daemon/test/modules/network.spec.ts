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
})
