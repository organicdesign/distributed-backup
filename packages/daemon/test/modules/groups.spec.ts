import assert from 'assert/strict'
import fs from 'fs/promises'
import { createNetClient } from '@organicdesign/net-rpc'
import * as cborg from 'cborg'
import all from 'it-all'
import { type CID } from 'multiformats/cid'
import { toString as uint8ArrayToString } from 'uint8arrays'
import createGroups from '../../src/modules/groups/index.js'
import createNetwork from '../../src/modules/network/index.js'
import createRpc from '../../src/modules/rpc/index.js'
import createSigint from '../../src/modules/sigint/index.js'
import { mkTestPath } from '../utils/paths.js'
import mockArgv from './mock-argv.js'
import mockBase from './mock-base.js'
import mockConfig from './mock-config.js'
import type {
  Requires as GroupsComponents,
  Provides as GroupsProvides
} from '../../src/modules/groups/index.js'

describe('groups', () => {
  const testPath = mkTestPath('groups')
  let components: Pick<GroupsComponents, 'config'> & {
    argv: ReturnType<typeof mockArgv>
    config: ReturnType<typeof mockConfig>
  }

  const mkGroup = async (m: GroupsProvides, name: string, peers: Uint8Array[] = []): Promise<CID> => {
    const manifest = await m.welo.determine({
      name,
      meta: { type: 'group' },
      access: {
        protocol: '/hldb/access/static',
        config: { write: [m.welo.identity.id, ...peers] }
      }
    })

    await m.groups.add(manifest)

    return manifest.address.cid
  }

  const create = async (): Promise<Pick<GroupsComponents, 'sigint' | 'config'> & {
    argv: ReturnType<typeof mockArgv>
    config: ReturnType<typeof mockConfig>
    rpc: Awaited<ReturnType<typeof createRpc>>
    base: ReturnType<typeof mockBase>
    network: Awaited<ReturnType<typeof createNetwork>>
    groups: GroupsProvides
  }> => {
    const sigint = await createSigint()
    const rpc = await createRpc({ ...components, sigint })
    const base = mockBase()
    const network = await createNetwork({ ...components, sigint, base, rpc })

    const groups = await createGroups({
      ...components,
      sigint,
      base,
      rpc,
      network
    })

    return {
      ...components,
      sigint,
      rpc,
      base,
      network,
      groups
    }
  }

  before(async () => {
    await fs.mkdir(testPath, { recursive: true })

    const argv = mockArgv(testPath)
    const config = mockConfig({ storage: ':memory:' })

    components = {
      argv,
      config
    }
  })

  after(async () => {
    await fs.rm(testPath, { recursive: true })
  })

  it('creates a group', async () => {
    const { groups: m, sigint } = await create()
    const group = await mkGroup(m, 'test')

    assert(group)

    await sigint.interupt()
  })

  it('tracker puts and checks a group\'s content', async () => {
    const { groups: m, sigint } = await create()
    const group = await mkGroup(m, 'test')
    const database = m.groups.get(group)

    if (database == null) {
      throw new Error('group creation failed')
    }

    const tracker = m.getTracker(database)

    const key = 'test'
    const put = database.store.creators.put(key, 'my-data')

    await database.replica.write(put)

    assert.equal(await tracker.validate(key, put), false)

    await tracker.put(key, put)

    assert.equal(await tracker.validate(key, put), true)

    await sigint.interupt()
  })

  it('tracker processes a group\'s content', async () => {
    const { groups: m, sigint } = await create()
    const group = await mkGroup(m, 'test')
    const database = m.groups.get(group)

    if (database == null) {
      throw new Error('group creation failed')
    }

    const tracker = m.getTracker(database)
    const key = '/test'
    const value = 'my-data'
    const put = database.store.creators.put(key, value)

    let entries = await all(tracker.process())
    assert.deepEqual(entries, [])

    await database.replica.write(put)
    entries = await all(tracker.process())
    assert.deepEqual(entries, [{ key, value: cborg.encode(value) }])

    entries = await all(tracker.process())
    assert.deepEqual(entries, [])

    await sigint.interupt()
  })

  it('tracker is scope limited', async () => {
    const { groups: m, sigint } = await create()
    const group = await mkGroup(m, 'test')
    const database = m.groups.get(group)

    if (database == null) {
      throw new Error('group creation failed')
    }

    const tracker = m.getTracker(database)
    const key = '/test'
    const value = 'my-data'
    const put = database.store.creators.put(key, value)

    await database.replica.write(put)

    let entries = await all(tracker.process('/another-key'))
    assert.deepEqual(entries, [])

    entries = await all(tracker.process(key))
    assert.deepEqual(entries, [{ key, value: cborg.encode(value) }])

    await sigint.interupt()
  })

  it('uses the identity from base in welo', async () => {
    const { groups: m, sigint, base } = await create()

    assert.deepEqual(m.welo.identity, await base.keyManager.getWeloIdentity())

    await sigint.interupt()
  })

  it('rpc - id returns the base58btc formatted welo id', async () => {
    const { groups: m, sigint, argv } = await create()
    const client = createNetClient(argv.socket)

    const id = await client.rpc.request('id', {})

    assert.equal(uint8ArrayToString(m.welo.identity.id, 'base58btc'), id)

    client.close()
    await sigint.interupt()
  })
})
