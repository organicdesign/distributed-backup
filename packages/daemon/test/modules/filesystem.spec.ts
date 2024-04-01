import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { unixfs } from '@helia/unixfs'
import { createDag } from '@organicdesign/db-test-utils'
import * as testData from '@organicdesign/db-test-utils/data'
import { importer } from '@organicdesign/db-utils'
import { createNetClient } from '@organicdesign/net-rpc'
import { MemoryBlockstore } from 'blockstore-core'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import setupFilesystem from '../../src/modules/filesystem/index.js'
import { createGroup } from '../utils/create-group.js'
import { mkTestPath } from '../utils/paths.js'
import type { Context as FilesystemContext } from '../../src/modules/filesystem/index.js'
import type { Components } from '@/common/interface.js'
import setup from '@/common/index.js'

describe('filesystem', () => {
  const testPath = mkTestPath('filesystem')

  const create = async (): Promise<{
    filesystem: FilesystemContext
    components: Components
    socket: string
  }> => {
    const socket = Path.join(testPath, `${Math.random()}.socket`)
    const components = await setup({ socket })
    const filesystem = await setupFilesystem(components)

    return { filesystem, components, socket }
  }

  before(async () => {
    await fs.mkdir(testPath, { recursive: true })
  })

  after(async () => {
    await fs.rm(testPath, { recursive: true })
  })

  it('uses all as the default revision strategy', async () => {
    const { filesystem, components } = await create()

    assert.equal(filesystem.config.defaultRevisionStrategy, 'all')

    await components.stop()
  })

  it('returns null when wraping a group that doesn\'t exist', async () => {
    const { filesystem, components } = await create()
    const fs = filesystem.getFileSystem(CID.parse('QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN'))

    assert.equal(fs, null)

    await components.stop()
  })

  it('wraps a group in a filesystem', async () => {
    const { filesystem, components } = await create()
    const group = await createGroup(components, 'test')
    const fs = filesystem.getFileSystem(group)

    assert.notEqual(fs, null)

    await components.stop()
  })

  it('uploads show in filesystem', async () => {
    const { filesystem, components } = await create()
    const group = await createGroup(components, 'test')
    const fs = filesystem.getFileSystem(group)
    const dag = await createDag(components.helia, 2, 2)
    const path = '/test'

    assert(fs != null)

    const before = Date.now()

    await filesystem.uploads.add('put', [group.bytes, path, {
      cid: dag[0].bytes,
      encrypted: false,
      revisionStrategy: 'all' as const,
      priority: 1
    }])

    const entry = await fs.get(path)
    const values = await Promise.all(dag.map(async d => components.helia.blockstore.get(d)))
    const size = values.reduce((a, c) => a + c.length, 0)

    assert(entry != null)
    assert.deepEqual(entry.author, components.welo.identity.id)
    assert.equal(entry.blocks, dag.length)
    assert.deepEqual(entry.cid, dag[0])
    assert.equal(entry.encrypted, false)
    assert.equal(entry.priority, 1)
    assert.equal(entry.revisionStrategy, 'all')
    assert.equal(entry.sequence, 0)
    assert.equal(entry.size, size)
    assert(entry.timestamp >= before)
    assert(entry.timestamp <= Date.now())

    await components.stop()
  })

  it('emits the file:added event when the FS was written to', async () => {
    const { filesystem, components } = await create()
    const group = await createGroup(components, 'test')
    const dag = await createDag(components.helia, 2, 2)
    const path = '/test'

    const promise = new Promise<void>((resolve, reject) => {
      setTimeout(() => { reject(new Error('timeout')) }, 100)

      components.events.addEventListener('file:added', () => { resolve() }, { once: true })
    })

    await filesystem.uploads.add('put', [group.bytes, path, {
      cid: dag[0].bytes,
      encrypted: false,
      revisionStrategy: 'all' as const,
      priority: 1
    }])

    await promise

    await components.stop()
  })

  it('local settings change FS output', async () => {
    const { filesystem, components } = await create()
    const group = await createGroup(components, 'test')
    const fs = filesystem.getFileSystem(group)
    const dag = await createDag(components.helia, 2, 2)
    const path = '/test'

    assert(fs != null)

    await filesystem.uploads.add('put', [group.bytes, path, {
      cid: dag[0].bytes,
      encrypted: false,
      revisionStrategy: 'all' as const,
      priority: 1
    }])

    await filesystem.localSettings.set(group, path, {
      priority: 100
    })

    const entry = await fs.get(path)

    assert(entry != null)
    assert.equal(entry.priority, 100)

    await components.stop()
  })

  it('rpc - delete (file)', async () => {
    const { filesystem, components, socket } = await create()
    const client = createNetClient(socket)
    const group = await createGroup(components, 'test')
    const fs = filesystem.getFileSystem(group)
    const dag = await createDag(components.helia, 2, 2)
    const path = '/test'

    assert(fs != null)

    await filesystem.uploads.add('put', [group.bytes, path, {
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
    await components.stop()
  })

  it('rpc - delete (directory)', async () => {
    const { filesystem, components, socket } = await create()
    const client = createNetClient(socket)
    const group = await createGroup(components, 'test')
    const fs = filesystem.getFileSystem(group)
    const dag = await createDag(components.helia, 2, 2)
    const rootPath = '/test'
    const paths = [`${rootPath}/file1`, `${rootPath}/file2`, `${rootPath}/sub/file3`]

    assert(fs != null)

    await Promise.all(paths.map(async path =>
      filesystem.uploads.add('put', [group.bytes, path, {
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
    await components.stop()
  })

  it('rpc - edit priority', async () => {
    const { filesystem, components, socket } = await create()
    const client = createNetClient(socket)
    const group = await createGroup(components, 'test')
    const fs = filesystem.getFileSystem(group)
    const path = '/test'
    const priority = 50

    assert(fs != null)

    const response = await client.rpc.request('edit', { group: group.toString(), path, priority })

    assert.equal(response, null)

    const localSettings = await filesystem.localSettings.get(group, path)

    assert.equal(localSettings.priority, priority)

    client.close()
    await components.stop()
  })

  it('rpc - export (file)', async () => {
    const { filesystem, components, socket } = await create()
    const client = createNetClient(socket)
    const group = await createGroup(components, 'test')
    const fs = filesystem.getFileSystem(group)
    const rootPath = '/test'
    const outPath = Path.join(testPath, 'export-file')

    assert(fs != null)

    await Promise.all(testData.files.map(async data => {
      const result = await all(importer(components.helia.blockstore, data.path))

      await filesystem.uploads.add('put', [group.bytes, data.generatePath(rootPath), {
        cid: result[0].cid.bytes,
        encrypted: false,
        revisionStrategy: 'all',
        priority: 1
      }])
    }))

    for (const data of testData.files) {
      const exportPath = data.generatePath(outPath)

      const response = await client.rpc.request('export', {
        group: group.toString(),
        path: data.generatePath(rootPath),
        outPath: exportPath
      })

      const valid = await data.validate(exportPath)

      assert.equal(response, null)
      assert.equal(valid, true)
    }

    client.close()
    await components.stop()
  })

  it('rpc - export (directory)', async () => {
    const { filesystem, components, socket } = await create()
    const client = createNetClient(socket)
    const group = await createGroup(components, 'test')
    const fs = filesystem.getFileSystem(group)
    const rootPath = '/test'
    const outPath = Path.join(testPath, 'export-directory')

    assert(fs != null)

    await Promise.all(testData.files.map(async data => {
      const result = await all(importer(components.helia.blockstore, data.path))

      await filesystem.uploads.add('put', [group.bytes, data.generatePath(rootPath), {
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

    for (const data of testData.files) {
      const exportPath = data.generatePath(outPath)
      const valid = await data.validate(exportPath)

      assert.equal(valid, true)
    }

    client.close()
    await components.stop()
  })

  it('rpc - import (file)', async () => {
    const { filesystem, components, socket } = await create()
    const client = createNetClient(socket)
    const group = await createGroup(components, 'test')
    const fs = filesystem.getFileSystem(group)
    const rootPath = '/test'

    assert(fs != null)

    await Promise.all(testData.files.map(async data => {
      const virtualPath = data.generatePath(rootPath)

      const response = await client.rpc.request('import', {
        group: group.toString(),
        path: virtualPath,
        inPath: data.path
      })

      assert.deepEqual(response, [{
        path: virtualPath,
        inPath: data.path,
        cid: data.cid.toString()
      }])

      const result = await fs.get(virtualPath)

      assert(result != null)
      assert.deepEqual(result.cid, data.cid)
    }))

    client.close()
    await components.stop()
  })

  it('rpc - import (directory)', async () => {
    const { filesystem, components, socket } = await create()
    const client = createNetClient(socket)
    const group = await createGroup(components, 'test')
    const fs = filesystem.getFileSystem(group)
    const rootPath = '/test'

    assert(fs != null)

    const response = await client.rpc.request('import', {
      group: group.toString(),
      path: rootPath,
      inPath: testData.root
    })

    assert(Array.isArray(response))
    assert.equal(response.length, testData.files.length)

    for (const data of response) {
      const dataFile = testData.getFile(data.inPath)

      assert(dataFile != null)
      assert.equal(data.path, dataFile.generatePath(rootPath))
      assert.equal(data.cid, dataFile.cid.toString())
    }

    const fsResult = await all(fs.getDir(rootPath))

    assert(Array.isArray(fsResult))
    assert.equal(fsResult.length, testData.files.length)

    for (const dataFile of testData.files) {
      const virtualPath = dataFile.generatePath(rootPath)
      const r = fsResult.find(r => r.key === virtualPath)

      assert(r != null)
      assert.deepEqual(r.value.cid, dataFile.cid)
    }

    client.close()
    await components.stop()
  })

  it('rpc - list', async () => {
    const { filesystem, components, socket } = await create()
    const client = createNetClient(socket)
    const group = await createGroup(components, 'test')
    const fs = filesystem.getFileSystem(group)
    const dag = await createDag(components.helia, 2, 2)
    const rootPath = '/test'
    const paths = [`${rootPath}/file1`, `${rootPath}/file2`, `${rootPath}/sub/file3`]

    assert(fs != null)

    const before = Date.now()

    await Promise.all(paths.map(async path =>
      filesystem.uploads.add('put', [group.bytes, path, {
        cid: dag[0].bytes,
        encrypted: false,
        revisionStrategy: 'all' as const,
        priority: 1
      }])
    ))

    const response = await client.rpc.request('list', { group: group.toString(), path: '/' })

    assert(Array.isArray(response))

    const values = await Promise.all(dag.map(async d => components.helia.blockstore.get(d)))
    const size = values.reduce((a, c) => a + c.length, 0)

    for (const entry of response) {
      assert(entry != null)
      assert.equal(entry.author, uint8ArrayToString(components.welo.identity.id, 'base58btc'))
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
    await components.stop()
  })

  it('rpc - read', async () => {
    const { filesystem, components, socket } = await create()
    const client = createNetClient(socket)
    const group = await createGroup(components, 'test')
    const ufs = unixfs(components.helia)
    const path = '/test'
    const data = 'test-data'

    const cid = await ufs.addBytes(uint8ArrayFromString(data))

    await filesystem.uploads.add('put', [group.bytes, path, {
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
    await components.stop()
  })

  it('rpc - write', async () => {
    const { filesystem, components, socket } = await create()
    const client = createNetClient(socket)
    const group = await createGroup(components, 'test')
    const fs = filesystem.getFileSystem(group)
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
    assert.deepEqual(entry1.author, components.welo.identity.id)
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

    const value2 = await components.blockstore.get(entry2.cid)

    assert.deepEqual(value2, uint8ArrayFromString(newData2))

    const newData3 = 'test'
    const write3 = await client.rpc.request('write', { group: group.toString(), path, data: newData3, length: newData3.length })

    assert.equal(write3, newData3.length)

    const entry3 = await fs.get(path)

    assert(entry3 != null)

    const value3 = await components.blockstore.get(entry3.cid)

    assert.deepEqual(value3, uint8ArrayFromString('test-data-long'))

    const newData4 = 'long'
    const write4 = await client.rpc.request('write', { group: group.toString(), path, data: newData4, length: newData4.length, position: 5 })

    assert.equal(write4, newData4.length)

    const entry4 = await fs.get(path)

    assert(entry4 != null)

    const value4 = await components.blockstore.get(entry4.cid)

    assert.deepEqual(value4, uint8ArrayFromString('test-long-long'))

    client.close()
    await components.stop()
  })
})
