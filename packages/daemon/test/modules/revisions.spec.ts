import assert from 'assert'
import fs from 'fs/promises'
import Path from 'path'
import { unixfs } from '@helia/unixfs'
import { importer } from '@organicdesign/db-fs-importer'
import { KeyManager } from '@organicdesign/db-key-manager'
import * as testData from '@organicdesign/db-test-utils'
import { createNetClient } from '@organicdesign/net-rpc'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import createDownloader from '../../src/modules/downloader/index.js'
import createFilesystem from '../../src/modules/filesystem/index.js'
import createGroups from '../../src/modules/groups/index.js'
import createNetwork from '../../src/modules/network/index.js'
import createRevisions from '../../src/modules/revisions/index.js'
import createRpc from '../../src/modules/rpc/index.js'
import createSigint from '../../src/modules/sigint/index.js'
import createTick from '../../src/modules/tick/index.js'
import { createGroup } from '../utils/create-group.js'
import { createDag } from '../utils/dag.js'
import { generateKey } from '../utils/generate-key.js'
import { mkTestPath } from '../utils/paths.js'
import mockArgv from './mock-argv.js'
import mockBase from './mock-base.js'
import mockConfig from './mock-config.js'

describe('revisions', () => {
  const testPath = mkTestPath('revisions')

  const create = async (name?: string): Promise<{
    argv: ReturnType<typeof mockArgv>
    config: ReturnType<typeof mockConfig>
    rpc: Awaited<ReturnType<typeof createRpc>>
    base: ReturnType<typeof mockBase>
    network: Awaited<ReturnType<typeof createNetwork>>
    groups: Awaited<ReturnType<typeof createGroups>>
    filesystem: Awaited<ReturnType<typeof createFilesystem>>
    sigint: Awaited<ReturnType<typeof createSigint>>
    tick: Awaited<ReturnType<typeof createTick>>
    revisions: Awaited<ReturnType<typeof createRevisions>>
  }> => {
    const path = name == null ? testPath : Path.join(testPath, name)

    const keyManager = new KeyManager(await generateKey())

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

    const downloader = await createDownloader({
      sigint,
      base,
      rpc,
      network,
      config
    })

    const tick = await createTick({ config, sigint })

    const filesystem = await createFilesystem({
      sigint,
      base,
      rpc,
      network,
      groups,
      downloader,
      tick,
      config
    })

    const revisions = await createRevisions({
      base,
      network,
      rpc,
      groups,
      filesystem,
      config,
      downloader,
      tick
    })

    return {
      argv,
      config,
      sigint,
      rpc,
      base,
      network,
      groups,
      filesystem,
      tick,
      revisions
    }
  }

  before(async () => {
    await fs.mkdir(testPath, { recursive: true })
  })

  after(async () => {
    await fs.rm(testPath, { recursive: true })
  })

  it('returns null when wraping a group that doesn\'t exist', async () => {
    const { revisions: m, sigint } = await create()
    const r = m.getRevisions(CID.parse('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'))

    assert.equal(r, null)

    await sigint.interupt()
  })

  it('wraps a group in revisions', async () => {
    const { revisions: m, groups, sigint } = await create()
    const group = await createGroup(groups, 'test')
    const r = m.getRevisions(group)

    assert.notEqual(r, null)

    await sigint.interupt()
  })

  it('creates a revision when a file is added to the filesystem', async () => {
    const { revisions: m, filesystem, network, groups, sigint } = await create()
    const group = await createGroup(groups, 'test')
    const r = m.getRevisions(group)
    const fs = filesystem.getFileSystem(group)
    const dag = await createDag(network.helia, 2, 2)
    const path = '/test'

    assert(r != null)
    assert(fs != null)

    const promise = new Promise<void>((resolve, reject) => {
      setTimeout(() => { reject(new Error('timeout')) }, 100)

      filesystem.events.addEventListener('file:added', () => { resolve() }, { once: true })
    })

    await filesystem.uploads.add('put', [group.bytes, path, {
      cid: dag[0].bytes,
      encrypted: false,
      revisionStrategy: 'all' as const,
      priority: 1
    }])

    const entry = await fs.get(path)

    assert(entry != null)

    await promise

    await new Promise(resolve => setTimeout(resolve, 100))

    const entries = await all(r.getAll(path))

    assert.deepEqual(entries, [{
      path,
      sequence: 0,
      author: groups.welo.identity.id,

      entry: {
        cid: entry.cid,
        encrypted: entry.encrypted,
        timestamp: entry.timestamp,
        blocks: entry.blocks,
        size: entry.size,
        priority: entry.priority
      }
    }])

    await sigint.interupt()
  })

  it('rpc - it exports a revision (file)', async () => {
    const { network, filesystem, groups, sigint, argv } = await create()
    const group = await createGroup(groups, 'test')
    const fs = filesystem.getFileSystem(group)
    const path = '/test'
    const client = createNetClient(argv.socket)
    const sequence = 0
    const dataFile = testData.data[0]
    const exportPath = dataFile.generatePath(testPath)

    assert(fs != null)

    const [{ cid }] = await all(importer(network.helia.blockstore, dataFile.path))

    const promise = new Promise<void>((resolve, reject) => {
      setTimeout(() => { reject(new Error('timeout')) }, 100)

      filesystem.events.addEventListener('file:added', () => { resolve() }, { once: true })
    })

    await filesystem.uploads.add('put', [group.bytes, path, {
      cid: cid.bytes,
      encrypted: false,
      revisionStrategy: 'all' as const,
      priority: 1
    }])

    await promise

    await new Promise(resolve => setTimeout(resolve, 100))

    const response = await client.rpc.request('export-revision', {
      group: group.toString(),
      path,
      author: uint8ArrayToString(groups.welo.identity.id, 'base58btc'),
      sequence,
      outPath: exportPath
    })

    assert.equal(response, null)

    const valid = await dataFile.validate(exportPath)

    assert.equal(valid, true)

    await sigint.interupt()
  })

  it('rpc - it exports a revision (directory)', async () => {
    const { network, filesystem, groups, sigint, argv } = await create()
    const group = await createGroup(groups, 'test')
    const fs = filesystem.getFileSystem(group)
    const rootPath = '/test'
    const client = createNetClient(argv.socket)
    const sequence = 0
    const outPath = Path.join(testPath, 'export-directory')

    assert(fs != null)

    for (const dataFile of testData.data) {
      const virtualPath = dataFile.generatePath(rootPath)

      const [{ cid }] = await all(importer(network.helia.blockstore, dataFile.path))

      const promise = new Promise<void>((resolve, reject) => {
        setTimeout(() => { reject(new Error('timeout')) }, 100)

        filesystem.events.addEventListener('file:added', () => { resolve() }, { once: true })
      })

      await filesystem.uploads.add('put', [group.bytes, virtualPath, {
        cid: cid.bytes,
        encrypted: false,
        revisionStrategy: 'all' as const,
        priority: 1
      }])

      await promise
    }

    await new Promise(resolve => setTimeout(resolve, 100))

    const response = await client.rpc.request('export-revision', {
      group: group.toString(),
      path: rootPath,
      author: uint8ArrayToString(groups.welo.identity.id, 'base58btc'),
      sequence,
      outPath
    })

    assert.equal(response, null)

    for (const dataFile of testData.data) {
      const exportPath = dataFile.generatePath(outPath)
      const valid = await dataFile.validate(exportPath)

      assert.equal(valid, true)
    }

    await sigint.interupt()
  })

  it('rpc - lists a revision (file)', async () => {
    const { network, filesystem, groups, sigint, argv } = await create()
    const group = await createGroup(groups, 'test')
    const fs = filesystem.getFileSystem(group)
    const path = '/test'
    const client = createNetClient(argv.socket)
    const dataFile = testData.data[0]

    assert(fs != null)

    const [{ cid }] = await all(importer(network.helia.blockstore, dataFile.path))

    const promise = new Promise<void>((resolve, reject) => {
      setTimeout(() => { reject(new Error('timeout')) }, 100)

      filesystem.events.addEventListener('file:added', () => { resolve() }, { once: true })
    })

    const before = Date.now()

    await filesystem.uploads.add('put', [group.bytes, path, {
      cid: cid.bytes,
      encrypted: false,
      revisionStrategy: 'all' as const,
      priority: 1
    }])

    await promise

    await new Promise(resolve => setTimeout(resolve, 100))

    const response = await client.rpc.request('list', {
      group: group.toString(),
      path
    })

    assert(Array.isArray(response))
    assert.equal(response.length, 1)
    assert.equal(response[0].author, uint8ArrayToString(groups.welo.identity.id, 'base58btc'))
    assert.equal(response[0].blocks, 1)
    assert.equal(response[0].cid, cid.toString())
    assert.equal(response[0].encrypted, false)
    assert.equal(response[0].path, path)
    assert.equal(response[0].priority, 1)
    assert.equal(response[0].revisionStrategy, 'all')
    assert.equal(response[0].size, 447)
    assert(response[0].timestamp >= before)
    assert(response[0].timestamp <= Date.now())

    await sigint.interupt()
  })

  it('rpc - it lists a revision (directory)', async () => {
    const { network, filesystem, groups, sigint, argv } = await create()
    const group = await createGroup(groups, 'test')
    const fs = filesystem.getFileSystem(group)
    const rootPath = '/test'
    const client = createNetClient(argv.socket)

    assert(fs != null)

    const before = Date.now()

    for (const dataFile of testData.data) {
      const virtualPath = dataFile.generatePath(rootPath)

      const [{ cid }] = await all(importer(network.helia.blockstore, dataFile.path))

      const promise = new Promise<void>((resolve, reject) => {
        setTimeout(() => { reject(new Error('timeout')) }, 100)

        filesystem.events.addEventListener('file:added', () => { resolve() }, { once: true })
      })

      await filesystem.uploads.add('put', [group.bytes, virtualPath, {
        cid: cid.bytes,
        encrypted: false,
        revisionStrategy: 'all' as const,
        priority: 1
      }])

      await promise
    }

    await new Promise(resolve => setTimeout(resolve, 100))

    const response = await client.rpc.request('list', {
      group: group.toString(),
      path: rootPath
    })

    assert(Array.isArray(response))
    assert.equal(response.length, 3)

    for (const item of response) {
      assert.equal(item.author, uint8ArrayToString(groups.welo.identity.id, 'base58btc'))
      assert.equal(item.blocks, 1)
      assert.equal(item.encrypted, false)
      assert.equal(item.priority, 1)
      assert.equal(item.revisionStrategy, 'all')
      assert(item.timestamp >= before)
      assert(item.timestamp <= Date.now())
    }

    for (const dataFile of testData.data) {
      const virtualPath = dataFile.generatePath(rootPath)
      const item = response.find(d => d.path === virtualPath)

      assert(item != null)
      assert(item.cid === dataFile.cid.toString())
      assert(BigInt(item.size) === dataFile.size)
    }

    await sigint.interupt()
  })

  it('rpc - read revision', async () => {
    const { filesystem, groups, network, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const group = await createGroup(groups, 'test')
    const ufs = unixfs(network.helia)
    const path = '/test'
    const data = 'test-data'

    const cid = await ufs.addBytes(uint8ArrayFromString(data))

    const promise = new Promise<void>((resolve, reject) => {
      setTimeout(() => { reject(new Error('timeout')) }, 100)

      filesystem.events.addEventListener('file:added', () => { resolve() }, { once: true })
    })

    await filesystem.uploads.add('put', [group.bytes, path, {
      cid: cid.bytes,
      encrypted: false,
      revisionStrategy: 'all' as const,
      priority: 1
    }])

    await promise

    await new Promise(resolve => setTimeout(resolve, 100))

    const coreParams = {
      group: group.toString(),
      path,
      sequence: 0,
      author: uint8ArrayToString(groups.welo.identity.id, 'base58btc')
    }

    const read1 = await client.rpc.request('read', coreParams)

    assert.deepEqual(read1, data)

    const read2 = await client.rpc.request('read', { ...coreParams, position: 1 })

    assert.deepEqual(read2, data.slice(1))

    const read3 = await client.rpc.request('read', { ...coreParams, length: 3 })

    assert.deepEqual(read3, data.slice(0, 3))

    const read4 = await client.rpc.request('read', { ...coreParams, position: 1, length: 3 })

    assert.deepEqual(read4, data.slice(1, 3 + 1))

    client.close()
    await sigint.interupt()
  })
})
