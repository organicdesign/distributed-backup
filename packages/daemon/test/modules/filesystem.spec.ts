import assert from 'assert/strict'
import { createHash } from 'crypto'
import fs from 'fs/promises'
import Path from 'path'
import { fileURLToPath } from 'url'
import { unixfs } from '@helia/unixfs'
import { importer, selectChunker } from '@organicdesign/db-fs-importer'
import { KeyManager } from '@organicdesign/db-key-manager'
import { createNetClient } from '@organicdesign/net-rpc'
import { MemoryBlockstore } from 'blockstore-core'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { compare as uint8ArrayCompare } from 'uint8arrays/compare'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import createDownloader from '../../src/modules/downloader/index.js'
import createFilesystem from '../../src/modules/filesystem/index.js'
import createGroups from '../../src/modules/groups/index.js'
import createNetwork from '../../src/modules/network/index.js'
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
import type { Provides as FSProvides } from '../../src/modules/filesystem/index.js'

const hash = async (path: string): Promise<Uint8Array> => {
  const hasher = createHash('sha256')

  hasher.write(await fs.readFile(path))

  return hasher.digest()
}

describe('filesystem', () => {
  const dataPath = Path.join(Path.dirname(fileURLToPath(import.meta.url)), '../../../test-data')
  const testPath = mkTestPath('filesystem')

  const create = async (name?: string): Promise<{
    argv: ReturnType<typeof mockArgv>
    config: ReturnType<typeof mockConfig>
    rpc: Awaited<ReturnType<typeof createRpc>>
    base: ReturnType<typeof mockBase>
    network: Awaited<ReturnType<typeof createNetwork>>
    groups: Awaited<ReturnType<typeof createGroups>>
    filesystem: FSProvides
    sigint: Awaited<ReturnType<typeof createSigint>>
    tick: Awaited<ReturnType<typeof createTick>>
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

    return {
      argv,
      config,
      sigint,
      rpc,
      base,
      network,
      groups,
      filesystem,
      tick
    }
  }

  before(async () => {
    await fs.mkdir(testPath, { recursive: true })
  })

  after(async () => {
    await fs.rm(testPath, { recursive: true })
  })

  it('uses all as the default revision strategy', async () => {
    const { filesystem: m, sigint } = await create()

    assert.equal(m.config.defaultRevisionStrategy, 'all')

    await sigint.interupt()
  })

  it('returns null when wraping a group that doesn\'t exist', async () => {
    const { filesystem: m, sigint } = await create()
    const fs = m.getFileSystem(CID.parse('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'))

    assert.equal(fs, null)

    await sigint.interupt()
  })

  it('wraps a group in a filesystem', async () => {
    const { filesystem: m, groups, sigint } = await create()
    const group = await createGroup(groups, 'test')
    const fs = m.getFileSystem(group)

    assert.notEqual(fs, null)

    await sigint.interupt()
  })

  it('uploads show in filesystem', async () => {
    const { filesystem: m, groups, network, sigint } = await create()
    const group = await createGroup(groups, 'test')
    const fs = m.getFileSystem(group)
    const dag = await createDag(network.helia, 2, 2)
    const path = '/test'

    assert(fs != null)

    const before = Date.now()

    await m.uploads.add('put', [group.bytes, path, {
      cid: dag[0].bytes,
      encrypted: false,
      revisionStrategy: 'all' as const,
      priority: 1
    }])

    const entry = await fs.get(path)
    const values = await Promise.all(dag.map(async d => network.helia.blockstore.get(d)))
    const size = values.reduce((a, c) => a + c.length, 0)

    assert(entry != null)
    assert.deepEqual(entry.author, groups.welo.identity.id)
    assert.equal(entry.blocks, dag.length)
    assert.deepEqual(entry.cid, dag[0])
    assert.equal(entry.encrypted, false)
    assert.equal(entry.priority, 1)
    assert.equal(entry.revisionStrategy, 'all')
    assert.equal(entry.sequence, 0)
    assert.equal(entry.size, size)
    assert(entry.timestamp >= before)
    assert(entry.timestamp <= Date.now())

    await sigint.interupt()
  })

  it('emits the file:added event when the FS was written to', async () => {
    const { filesystem: m, groups, network, sigint } = await create()
    const group = await createGroup(groups, 'test')
    const dag = await createDag(network.helia, 2, 2)
    const path = '/test'

    const promise = new Promise<void>((resolve, reject) => {
      setTimeout(() => { reject(new Error('timeout')) }, 100)

      m.events.addEventListener('file:added', () => { resolve() }, { once: true })
    })

    await m.uploads.add('put', [group.bytes, path, {
      cid: dag[0].bytes,
      encrypted: false,
      revisionStrategy: 'all' as const,
      priority: 1
    }])

    await promise

    await sigint.interupt()
  })

  it('local settings change FS output', async () => {
    const { filesystem: m, groups, network, sigint } = await create()
    const group = await createGroup(groups, 'test')
    const fs = m.getFileSystem(group)
    const dag = await createDag(network.helia, 2, 2)
    const path = '/test'

    assert(fs != null)

    await m.uploads.add('put', [group.bytes, path, {
      cid: dag[0].bytes,
      encrypted: false,
      revisionStrategy: 'all' as const,
      priority: 1
    }])

    await m.localSettings.set(group, path, {
      priority: 100
    })

    const entry = await fs.get(path)

    assert(entry != null)
    assert.equal(entry.priority, 100)

    await sigint.interupt()
  })

  it('rpc - delete (file)', async () => {
    const { filesystem: m, groups, network, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const group = await createGroup(groups, 'test')
    const fs = m.getFileSystem(group)
    const dag = await createDag(network.helia, 2, 2)
    const path = '/test'

    assert(fs != null)

    await m.uploads.add('put', [group.bytes, path, {
      cid: dag[0].bytes,
      encrypted: false,
      revisionStrategy: 'all' as const,
      priority: 1
    }])

    const response = await client.rpc.request('delete', { group: group.toString(), path })

    assert.deepEqual(response, [{ path, cid: dag[0].toString() }])

    const entry = await fs.get(path)

    assert.equal(entry, null)

    client.close()
    await sigint.interupt()
  })

  it('rpc - delete (directory)', async () => {
    const { filesystem: m, groups, network, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const group = await createGroup(groups, 'test')
    const fs = m.getFileSystem(group)
    const dag = await createDag(network.helia, 2, 2)
    const rootPath = '/test'
    const paths = [`${rootPath}/file1`, `${rootPath}/file2`, `${rootPath}/sub/file3`]

    assert(fs != null)

    await Promise.all(paths.map(async path =>
      m.uploads.add('put', [group.bytes, path, {
        cid: dag[0].bytes,
        encrypted: false,
        revisionStrategy: 'all' as const,
        priority: 1
      }])
    ))

    const response = await client.rpc.request('delete', { group: group.toString(), path: rootPath })

    assert.deepEqual(response, paths.map(path => ({ path, cid: dag[0].toString() })))

    const entries = await all(fs.getDir(rootPath))

    assert.deepEqual(entries, [])

    client.close()
    await sigint.interupt()
  })

  it('rpc - edit priority', async () => {
    const { filesystem: m, groups, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const group = await createGroup(groups, 'test')
    const fs = m.getFileSystem(group)
    const path = '/test'
    const priority = 50

    assert(fs != null)

    const response = await client.rpc.request('edit', { group: group.toString(), path, priority })

    assert.equal(response, null)

    const localSettings = await m.localSettings.get(group, path)

    assert.equal(localSettings.priority, priority)

    client.close()
    await sigint.interupt()
  })

  it('rpc - export (file)', async () => {
    const { filesystem: m, network, groups, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const group = await createGroup(groups, 'test')
    const fs = m.getFileSystem(group)
    const rootPath = '/test'
    const chunker = selectChunker()
    const outPath = Path.join(testPath, 'export-file')

    const paths = [
      'file-1.txt',
      'file-2.txt',
      'dir-1/file-3.txt'
    ].map(path => ({
      in: Path.join(dataPath, path),
      out: Path.join(outPath, path),
      virtual: Path.join(rootPath, path)
    }))

    assert(fs != null)

    await Promise.all(paths.map(async path => {
      const result = await all(importer(
        network.helia.blockstore,
        path.in,
        {
          chunker,
          cidVersion: 1
        }
      ))

      await m.uploads.add('put', [group.bytes, path.virtual, {
        cid: result[0].cid.bytes,
        encrypted: false,
        revisionStrategy: 'all',
        priority: 1
      }])
    }))

    for (const path of paths) {
      const response = await client.rpc.request('export', {
        group: group.toString(),
        path: path.virtual,
        outPath: path.out
      })

      const [inHash, outHash] = await Promise.all([
        hash(path.in),
        hash(path.out)
      ])

      assert.equal(response, null)
      assert.deepEqual(inHash, outHash)
    }

    client.close()
    await sigint.interupt()
  })

  it('rpc - export (directory)', async () => {
    const { filesystem: m, network, groups, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const group = await createGroup(groups, 'test')
    const fs = m.getFileSystem(group)
    const rootPath = '/test'
    const chunker = selectChunker()
    const outPath = Path.join(testPath, 'export-directory')

    const paths = [
      'file-1.txt',
      'file-2.txt',
      'dir-1/file-3.txt'
    ].map(path => ({
      in: Path.join(dataPath, path),
      out: Path.join(outPath, path),
      virtual: Path.join(rootPath, path)
    }))

    assert(fs != null)

    await Promise.all(paths.map(async path => {
      const result = await all(importer(
        network.helia.blockstore,
        path.in,
        {
          chunker,
          cidVersion: 1
        }
      ))

      await m.uploads.add('put', [group.bytes, path.virtual, {
        cid: result[0].cid.bytes,
        encrypted: false,
        revisionStrategy: 'all',
        priority: 1
      }])
    }))

    const response = await client.rpc.request('export', {
      group: group.toString(),
      path: rootPath,
      outPath
    })

    assert.equal(response, null)

    for (const path of paths) {
      const [inHash, outHash] = await Promise.all([
        hash(path.in),
        hash(path.out)
      ])
      assert.deepEqual(inHash, outHash)
    }

    client.close()
    await sigint.interupt()
  })

  it('rpc - import (file)', async () => {
    const { filesystem: m, groups, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const group = await createGroup(groups, 'test')
    const fs = m.getFileSystem(group)
    const rootPath = '/test'
    const outPath = Path.join(testPath, 'export-file')

    const paths = [
      {
        name: 'file-1.txt',
        cid: 'bafkreig5rpawfjnti2uck52ndflv6o4urk6rtqexwpspmpcv3tc7xilfui'
      },
      {
        name: 'file-2.txt',
        cid: 'bafkreifjsfnld3qc5kwru3qkzcpqbryanuj6ocyjhgpguoukwn7jjjgaa4'
      },
      {
        name: 'dir-1/file-3.txt',
        cid: 'bafkreifuptapcbfwfvghymf422h5rztwcpripxck3dbrb3yqzow6vhcdqa'
      }
    ].map(path => ({
      ...path,
      in: Path.join(dataPath, path.name),
      out: Path.join(outPath, path.name),
      virtual: Path.join(rootPath, path.name)
    }))

    assert(fs != null)

    await Promise.all(paths.map(async path => {
      const response = await client.rpc.request('import', {
        group: group.toString(),
        path: path.virtual,
        inPath: path.in
      })

      assert.deepEqual(response, [{
        path: path.virtual,
        inPath: path.in,
        cid: path.cid
      }])

      const result = await fs.get(path.virtual)

      assert(result != null)
      assert.deepEqual(result.cid, CID.parse(path.cid))
    }))

    client.close()
    await sigint.interupt()
  })

  it('rpc - import (directory)', async () => {
    const { filesystem: m, groups, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const group = await createGroup(groups, 'test')
    const fs = m.getFileSystem(group)
    const rootPath = '/test'
    const outPath = Path.join(testPath, 'export-file')

    const paths = [
      {
        name: 'file-1.txt',
        cid: 'bafkreig5rpawfjnti2uck52ndflv6o4urk6rtqexwpspmpcv3tc7xilfui'
      },
      {
        name: 'file-2.txt',
        cid: 'bafkreifjsfnld3qc5kwru3qkzcpqbryanuj6ocyjhgpguoukwn7jjjgaa4'
      },
      {
        name: 'dir-1/file-3.txt',
        cid: 'bafkreifuptapcbfwfvghymf422h5rztwcpripxck3dbrb3yqzow6vhcdqa'
      }
    ].map(path => ({
      ...path,
      in: Path.join(dataPath, path.name),
      out: Path.join(outPath, path.name),
      virtual: Path.join(rootPath, path.name)
    }))

    assert(fs != null)

    const response = await client.rpc.request('import', {
      group: group.toString(),
      path: rootPath,
      inPath: dataPath
    })

    const cidSort = (a: { cid: string }, b: { cid: string }): number => uint8ArrayCompare(uint8ArrayFromString(a.cid), uint8ArrayFromString(b.cid))

    response.sort(cidSort)

    const expectedResponse = paths.map(path => ({
      path: path.virtual,
      inPath: path.in,
      cid: path.cid
    }))

    expectedResponse.sort(cidSort)

    assert.deepEqual(response, expectedResponse)

    const fsResult = await all(fs.getDir(rootPath))

    const lCids = fsResult.map(r => r.value.cid)
    const rCids = paths.map(path => CID.parse(path.cid))
    const lPaths = fsResult.map(r => r.key.toString())
    const rPaths = paths.map(path => path.virtual)

    lCids.sort((a, b) => uint8ArrayCompare(a.bytes, b.bytes))
    rCids.sort((a, b) => uint8ArrayCompare(a.bytes, b.bytes))
    lPaths.sort()
    rPaths.sort()

    assert.deepEqual(lCids, rCids)
    assert.deepEqual(lPaths, rPaths)

    client.close()
    await sigint.interupt()
  })

  it('rpc - list', async () => {
    const { filesystem: m, groups, network, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const group = await createGroup(groups, 'test')
    const fs = m.getFileSystem(group)
    const dag = await createDag(network.helia, 2, 2)
    const rootPath = '/test'
    const paths = [`${rootPath}/file1`, `${rootPath}/file2`, `${rootPath}/sub/file3`]

    assert(fs != null)

    const before = Date.now()

    await Promise.all(paths.map(async path =>
      m.uploads.add('put', [group.bytes, path, {
        cid: dag[0].bytes,
        encrypted: false,
        revisionStrategy: 'all' as const,
        priority: 1
      }])
    ))

    const response = await client.rpc.request('list', { group: group.toString(), path: '/' })

    assert(Array.isArray(response))

    const values = await Promise.all(dag.map(async d => network.helia.blockstore.get(d)))
    const size = values.reduce((a, c) => a + c.length, 0)

    for (const entry of response) {
      assert(entry != null)
      assert.equal(entry.author, uint8ArrayToString(groups.welo.identity.id, 'base58btc'))
      assert.equal(entry.blocks, dag.length)
      assert.deepEqual(entry.cid, dag[0].toString())
      assert.equal(entry.encrypted, false)
      assert.equal(entry.priority, 1)
      assert.equal(entry.revisionStrategy, 'all')
      assert.equal(entry.size, size)
      assert(entry.timestamp >= before)
      assert(entry.timestamp <= Date.now())
    }

    client.close()
    await sigint.interupt()
  })

  it('rpc - read', async () => {
    const { filesystem: m, groups, network, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const group = await createGroup(groups, 'test')
    const ufs = unixfs(network.helia)
    const path = '/test'
    const data = 'test-data'

    const cid = await ufs.addBytes(uint8ArrayFromString(data))

    await m.uploads.add('put', [group.bytes, path, {
      cid: cid.bytes,
      encrypted: false,
      revisionStrategy: 'all' as const,
      priority: 1
    }])

    const read1 = await client.rpc.request('read', { group: group.toString(), path })

    assert.deepEqual(read1, data)

    const read2 = await client.rpc.request('read', { group: group.toString(), path, position: 1 })

    assert.deepEqual(read2, data.slice(1))

    const read3 = await client.rpc.request('read', { group: group.toString(), path, length: 3 })

    assert.deepEqual(read3, data.slice(0, 3))

    const read4 = await client.rpc.request('read', { group: group.toString(), path, position: 1, length: 3 })

    assert.deepEqual(read4, data.slice(1, 3 + 1))

    client.close()
    await sigint.interupt()
  })

  it('rpc - write', async () => {
    const { filesystem: m, base, groups, sigint, argv } = await create()
    const client = createNetClient(argv.socket)
    const group = await createGroup(groups, 'test')
    const fs = m.getFileSystem(group)
    const ufs = unixfs({ blockstore: new MemoryBlockstore() })
    const path = '/test'
    const data = 'test-data'
    const cid = await ufs.addBytes(uint8ArrayFromString(data))

    assert(fs != null)

    const before = Date.now()

    const write1 = await client.rpc.request('write', { group: group.toString(), path, data })

    assert.equal(write1, data.length)

    const entry1 = await fs.get(path)

    assert(entry1 != null)
    assert.deepEqual(entry1.author, groups.welo.identity.id)
    assert.equal(entry1.blocks, 1)
    assert.deepEqual(entry1.cid, cid)
    assert.equal(entry1.encrypted, false)
    assert.equal(entry1.priority, 100)
    assert.equal(entry1.revisionStrategy, 'all')
    assert.equal(entry1.size, data.length)
    assert(entry1.timestamp >= before)
    assert(entry1.timestamp <= Date.now())

    const newData2 = 'your-data-long'
    const write2 = await client.rpc.request('write', { group: group.toString(), path, data: newData2 })

    assert.equal(write2, newData2.length)

    const entry2 = await fs.get(path)

    assert(entry2 != null)

    const value2 = await base.blockstore.get(entry2.cid)

    assert.deepEqual(value2, uint8ArrayFromString(newData2))

    const newData3 = 'test'
    const write3 = await client.rpc.request('write', { group: group.toString(), path, data: newData3, length: newData3.length })

    assert.equal(write3, newData3.length)

    const entry3 = await fs.get(path)

    assert(entry3 != null)

    const value3 = await base.blockstore.get(entry3.cid)

    assert.deepEqual(value3, uint8ArrayFromString('test-data-long'))

    const newData4 = 'long'
    const write4 = await client.rpc.request('write', { group: group.toString(), path, data: newData4, length: newData4.length, position: 5 })

    assert.equal(write4, newData4.length)

    const entry4 = await fs.get(path)

    assert(entry4 != null)

    const value4 = await base.blockstore.get(entry4.cid)

    assert.deepEqual(value4, uint8ArrayFromString('test-long-long'))

    client.close()
    await sigint.interupt()
  })
})
