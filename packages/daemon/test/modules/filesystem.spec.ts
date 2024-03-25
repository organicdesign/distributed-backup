import assert from 'assert/strict'
import { createHash } from 'crypto'
import fs from 'fs/promises'
import Path from 'path'
import { fileURLToPath } from 'url'
import { importer, selectHasher, selectChunker } from '@organicdesign/db-fs-importer'
import { KeyManager } from '@organicdesign/db-key-manager'
import { createNetClient } from '@organicdesign/net-rpc'
import all from 'it-all'
import { CID } from 'multiformats/cid'
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
    const hasher = selectHasher()
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
          hasher,
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
    const hasher = selectHasher()
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
          hasher,
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
})
