import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { createNetClient } from '@organicdesign/net-rpc'
import * as cborg from 'cborg'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { createGroup } from '../utils/create-group.js'
import { mkTestPath } from '../utils/paths.js'
import type { Components } from '@/common/interface.js'
import setup from '@/common/index.js'

describe('groups', () => {
  const testPath = mkTestPath('groups')

  before(async () => {
    await fs.mkdir(testPath, { recursive: true })
  })

  after(async () => {
    await fs.rm(testPath, { recursive: true })
  })

  const create = async (config: Record<string, unknown> = {}): Promise<{ components: Components, socket: string }> => {
    const socket = Path.join(testPath, `${Math.random()}.socket`)
    const components = await setup({ socket, config })

    return { components, socket }
  }

  it('creates a group', async () => {
    const { components } = await create()
    const group = await createGroup(components, 'test')

    assert(group)

    await components.stop()
  })

  it('bootstraps a group from config', async () => {
    const { components: components1 } = await create()

    const group = await createGroup(components1, 'test')

    const { components: components2 } = await create({
      groups: [group.toString()],
      bootstrap: components1.libp2p.getMultiaddrs().map(a => a.toString())
    })

    // Wait until it actually downloads the group block.
    await components2.helia.blockstore.get(group)

    // Give it a second to be added to the groups
    await new Promise(resolve => setTimeout(resolve, 100))

    const foundGroup = components2.groups.get(group)

    assert(foundGroup != null)

    await Promise.all([
      components1.stop(),
      components2.stop()
    ])
  })

  it.skip('bootstrapping a group from config does not hang startup', async () => {
    const { components } = await new Promise<{ components: Components }>((resolve, reject) => {
      setTimeout(() => { reject(new Error('timeout')) }, 5000)

      create({
        groups: ['QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN']
      }).then(resolve).catch(reject)
    })

    await components.stop()
  })

  it('tracker puts and checks a group\'s content', async () => {
    const { components } = await create()
    const group = await createGroup(components, 'test')
    const database = components.groups.get(group)

    if (database == null) {
      throw new Error('group creation failed')
    }

    const tracker = components.getTracker(database)

    const key = 'test'
    const put = database.store.creators.put(key, 'my-data')

    await database.replica.write(put)

    assert.equal(await tracker.validate(key, put), false)

    await tracker.put(key, put)

    assert.equal(await tracker.validate(key, put), true)

    await components.stop()
  })

  it('tracker processes a group\'s content', async () => {
    const { components } = await create()
    const group = await createGroup(components, 'test')
    const database = components.groups.get(group)

    if (database == null) {
      throw new Error('group creation failed')
    }

    const tracker = components.getTracker(database)
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

    await components.stop()
  })

  it('tracker is scope limited', async () => {
    const { components } = await create()
    const group = await createGroup(components, 'test')
    const database = components.groups.get(group)

    if (database == null) {
      throw new Error('group creation failed')
    }

    const tracker = components.getTracker(database)
    const key = '/test'
    const value = 'my-data'
    const put = database.store.creators.put(key, value)

    await database.replica.write(put)

    let entries = await all(tracker.process('/another-key'))
    assert.deepEqual(entries, [])

    entries = await all(tracker.process(key))
    assert.deepEqual(entries, [{ key, value: cborg.encode(value) }])

    await components.stop()
  })

  it('uses the identity from base in welo', async () => {
    const { components } = await create()

    assert.deepEqual(components.welo.identity, await components.keyManager.getWeloIdentity())

    await components.stop()
  })

  it('rpc - id returns the base58btc formatted welo id', async () => {
    const { components, socket } = await create()
    const client = createNetClient(socket)

    const id = await client.rpc.request('id', {})

    assert.equal(uint8ArrayToString(components.welo.identity.id, 'base58btc'), id)

    client.close()
    await components.stop()
  })

  it('rpc - create groups creates a group without other peers', async () => {
    const { components, socket } = await create()
    const client = createNetClient(socket)
    const name = 'test'

    const cid = await client.rpc.request('create-group', { name, peers: [] })
    const group = CID.parse(cid)
    const database = components.groups.get(group)

    assert(database != null)
    assert.equal(database.manifest.name, name)
    assert.deepEqual(database.manifest.access.config?.write, [components.welo.identity.id])

    client.close()
    await components.stop()
  })

  it('rpc - create groups creates a group with other peers', async () => {
    const { components, socket } = await create()
    const client = createNetClient(socket)
    const name = 'test'
    const otherPeer = 'GZsJqUjmbVqZCUMbJoe5ye4xfdKZVPVwBoFFQiyCZYesq6Us5b'

    const cid = await client.rpc.request('create-group', { name, peers: [otherPeer] })
    const group = CID.parse(cid)
    const database = components.groups.get(group)

    assert(database != null)
    assert.equal(database.manifest.name, name)
    assert.deepEqual(database.manifest.access.config?.write, [
      components.welo.identity.id,
      uint8ArrayFromString(otherPeer, 'base58btc')
    ])

    client.close()
    await components.stop()
  })

  it('rpc - joins an external group', async () => {
    const components = await Promise.all([create(), create()])
    const client = createNetClient(components[0].socket)
    const name = 'test'
    const group = await createGroup(components[1].components, name)

    await components[0].components.libp2p.dial(components[1].components.libp2p.getMultiaddrs())
    const res = await client.rpc.request('join-group', { group: group.toString() })

    assert.equal(res, null)

    const database = components[0].components.groups.get(group)

    assert(database)
    assert.equal(database.manifest.name, name)

    client.close()
    await Promise.all(components.map(async c => c.components.stop()))
  })

  it('rpc - list groups', async () => {
    const { components, socket } = await create()
    const client = createNetClient(socket)
    const name = 'test'

    let groups = await client.rpc.request('list-groups', {})

    assert.deepEqual(groups, [])

    const group = await createGroup(components, name)

    groups = await client.rpc.request('list-groups', {})

    assert.deepEqual(groups, [{ group: group.toString(), name }])

    client.close()
    await components.stop()
  })

  // This fails it github too - seems to think the `server-sync-groups` socket is in use?
  it.skip('rpc - sync groups', async () => {
    const components = await Promise.all([create(), create()])
    const client = createNetClient(components[0].socket)
    const key = '/test'
    const value = 'test-value'

    const groups = await client.rpc.request('list-groups', {})

    assert.deepEqual(groups, [])

    const group = await createGroup(components[1].components, 'test')
    const database = components[1].components.groups.get(group)

    if (database == null) {
      throw new Error('database creation failed')
    }

    const put = database.store.creators.put(key, value)

    await database.replica.write(put)

    await components[0].components.libp2p.dial(components[1].components.libp2p.getMultiaddrs())
    await client.rpc.request('join-group', { group: group.toString() })
    await client.rpc.request('sync', {})

    const index = await database.store.latest()
    const result = await database.store.selectors.get(index)(key)

    assert.deepEqual(result, value)

    client.close()
    await Promise.all(components.map(async c => c.components.stop()))
  })
})
