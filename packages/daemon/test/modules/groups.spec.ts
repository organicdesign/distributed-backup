import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { KeyManager, parseKeyData } from '@organicdesign/db-key-manager'
import { createNetClient } from '@organicdesign/net-rpc'
import * as cborg from 'cborg'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
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

  const create = async (name?: string): Promise<Pick<GroupsComponents, 'sigint' | 'config'> & {
    argv: ReturnType<typeof mockArgv>
    config: ReturnType<typeof mockConfig>
    rpc: Awaited<ReturnType<typeof createRpc>>
    base: ReturnType<typeof mockBase>
    network: Awaited<ReturnType<typeof createNetwork>>
    groups: GroupsProvides
  }> => {
    const path = name == null ? testPath : Path.join(testPath, name)

    const keyManager = name == null
      ? undefined
      : new KeyManager(parseKeyData({
        key: 'DpGbLiAX4wK4HHtG3DQb8cA6FG2ibv93X4ooZJ5LmMJJ-12FmenN8dbWysuYnzEHzmEF1hod4RGK8NfKFu1SEZ7XM',
        psk: '/key/swarm/psk/1.0.0/\n/base16/\n023330a98e30315e2233d4a31a6dc65d741a89f7ce6248e7de40c73995d23157'
      }))

    await fs.mkdir(path, { recursive: true })

    const argv = mockArgv(path)
    const config = mockConfig({ storage: ':memory:' })
    const sigint = await createSigint()
    const rpc = await createRpc({ argv, sigint })
    const base = mockBase({ keyManager })
    const network = await createNetwork({ config, sigint, base, rpc })

    const groups = await createGroups({
      sigint,
      base,
      rpc,
      network
    })

    return {
      argv,
      config,
      sigint,
      rpc,
      base,
      network,
      groups
    }
  }

  before(async () => {
    await fs.mkdir(testPath, { recursive: true })
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

  it('rpc - create groups creates a group without other peers', async () => {
    const { groups: m, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const name = 'test'

    const cid = await client.rpc.request('create-group', { name, peers: [] })
    const group = CID.parse(cid)
    const database = m.groups.get(group)

    assert(database != null)
    assert.equal(database.manifest.name, name)
    assert.deepEqual(database.manifest.access.config?.write, [m.welo.identity.id])

    client.close()
    await sigint.interupt()
  })

  it('rpc - create groups creates a group with other peers', async () => {
    const { groups: m, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const name = 'test'
    const otherPeer = 'GZsJqUjmbVqZCUMbJoe5ye4xfdKZVPVwBoFFQiyCZYesq6Us5b'

    const cid = await client.rpc.request('create-group', { name, peers: [otherPeer] })
    const group = CID.parse(cid)
    const database = m.groups.get(group)

    assert(database != null)
    assert.equal(database.manifest.name, name)
    assert.deepEqual(database.manifest.access.config?.write, [
      m.welo.identity.id,
      uint8ArrayFromString(otherPeer, 'base58btc')
    ])

    client.close()
    await sigint.interupt()
  })

  it('rpc - joins an external group', async () => {
    const components = await Promise.all([create(), create('server')])
    const client = createNetClient(components[0].argv.socket)
    const name = 'test'
    const group = await mkGroup(components[1].groups, name)

    await components[0].network.libp2p.dial(components[1].network.libp2p.getMultiaddrs())
    const res = await client.rpc.request('join-group', { group: group.toString() })

    assert.equal(res, null)

    const database = components[0].groups.groups.get(group)

    assert(database)
    assert.equal(database.manifest.name, name)

    client.close()
    await Promise.all(components.map(async c => c.sigint.interupt()))
  })

  it('rpc - list groups', async () => {
    const { groups: m, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const name = 'test'

    let groups = await client.rpc.request('list-groups', {})

    assert.deepEqual(groups, [])

    const group = await mkGroup(m, name)

    groups = await client.rpc.request('list-groups', {})

    assert.deepEqual(groups, [{ group: group.toString(), name }])

    client.close()
    await sigint.interupt()
  })

  it('rpc - sync groups', async () => {
    const components = await Promise.all([create(), create('server')])
    const client = createNetClient(components[0].argv.socket)
    const key = '/test'
    const value = 'test-value'

    const groups = await client.rpc.request('list-groups', {})

    assert.deepEqual(groups, [])

    const group = await mkGroup(components[1].groups, 'test')
    const database = components[1].groups.groups.get(group)

    if (database == null) {
      throw new Error('database creation failed')
    }

    const put = database.store.creators.put(key, value)

    await database.replica.write(put)

    await components[0].network.libp2p.dial(components[1].network.libp2p.getMultiaddrs())
    await client.rpc.request('join-group', { group: group.toString() })
    await client.rpc.request('sync', {})

    const index = await database.store.latest()
    const result = await database.store.selectors.get(index)(key)

    assert.deepEqual(result, value)

    client.close()
    await Promise.all(components.map(async c => c.sigint.interupt()))
  })
})
