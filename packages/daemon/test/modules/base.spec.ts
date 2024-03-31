import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { extendDatastore } from '@organicdesign/db-utils'
import { MemoryBlockstore } from 'blockstore-core'
import { FsBlockstore } from 'blockstore-fs'
import { MemoryDatastore } from 'datastore-core'
import { FsDatastore } from 'datastore-fs'
import { Key } from 'interface-datastore'
import { CID } from 'multiformats/cid'
import { fromString as uint8ArrayFromString } from 'uint8arrays'
import { mkTestPath } from '../utils/paths.js'
import setup from '@/common/index.js'

const parseStr = (data: string): Uint8Array => uint8ArrayFromString(data, 'base64')
const testPath = mkTestPath('base')

describe('base', () => {
  const keyPath = Path.join(testPath, 'key.json')
  const socket = Path.join(testPath, 'server.socket')

  before(async () => {
    await fs.mkdir(testPath, { recursive: true })

    await fs.writeFile(keyPath, JSON.stringify({
      key: '5TP9VimJU1WdSoTxZGLhSuPKqCpXirPHDK4ZjHxzetex-8zAV14C4oLe4dytUSVzznTuQ659pY1dSMG8HAQenDqVQ',
      psk: '/key/swarm/psk/1.0.0/\n/base16/\n56d3c18282f1f1b1b3e04e40dd5d8bf44cafa8bc9c9bc7c57716a7766fa2c550'
    }))
  })

  after(async () => {
    await fs.rm(testPath, { recursive: true })
  })

  it('returns the key manager', async () => {
    const components = await setup({ key: keyPath, socket })

    assert.deepEqual(
      new Uint8Array(components.keyManager.aesKey),
      parseStr('knUGn6uUeQcoxfM1qAtg3F/Njm4bp+GcZK257NZ5AtE')
    )

    assert.deepEqual(
      new Uint8Array(components.keyManager.hmacKey),
      parseStr('KZkJfNz3bRrn6XHvWYtD4+dXvmhdT4TBhBIkWn8y3jY')
    )

    assert.deepEqual(
      (await components.keyManager.getWeloIdentity()).id,
      parseStr('CAISIQPSvjmKINqJY5SA/3c+kadFmIsHeTXtTJYlrooZ53DTUg')
    )

    assert.deepEqual(
      (await components.keyManager.getPeerId()).toBytes(),
      parseStr('ACUIAhIhA5m2/DfXxqi0i+fyYixRaWGirDEVemxUEv8WMZPwFPZB')
    )

    assert.deepEqual(
      components.keyManager.getPskKey(),
      parseStr('L2tleS9zd2FybS9wc2svMS4wLjAvCi9iYXNlMTYvCjU2ZDNjMTgyODJmMWYxYjFiM2UwNGU0MGRkNWQ4YmY0NGNhZmE4YmM5YzliYzdjNTc3MTZhNzc2NmZhMmM1NTA')
    )

    await components.stop()
  })

  it('uses memory blockstore when memory is specified', async () => {
    const components = await setup({ socket, config: { storage: ':memory:' } })

    assert(components.blockstore instanceof MemoryBlockstore)

    await components.stop()
  })

  it('uses memory datastore when memory is specified', async () => {
    const components = await setup({ socket, config: { storage: ':memory:' } })

    assert(components.datastore instanceof MemoryDatastore)

    await components.stop()
  })

  it('uses fs blockstore when a path is specified', async () => {
    const blockstorePath = Path.join(testPath, 'blockstore')
    const testData = uint8ArrayFromString('test')

    const components = await setup({ socket, config: { storage: testPath } })

    assert(components.blockstore instanceof FsBlockstore)

    await components.blockstore.put(CID.parse('QmaCpDMGvV2BGHeYERUEnRQAwe3N8SzbUtfsmvsqQLuvuJ'), testData)

    const out = await fs.readdir(blockstorePath, { recursive: true })

    assert.deepEqual(out, [
      '7I',
      '7I/BCIQLASSX2QHMUE4IBHYTTJ3LCICEGM6DOQBZDSN7DTU5RYQ2PEQQX7I.data'
    ])

    const blockData = await fs.readFile(Path.join(blockstorePath, '7I/BCIQLASSX2QHMUE4IBHYTTJ3LCICEGM6DOQBZDSN7DTU5RYQ2PEQQX7I.data'))

    assert.deepEqual(new Uint8Array(blockData), testData)

    await components.stop()
  })

  it('uses fs datastore when a path is specified', async () => {
    const datastorePath = Path.join(testPath, 'datastore', 'test')

    const components = await setup({ socket, config: { storage: testPath } })

    assert(components.datastore instanceof FsDatastore)

    const datastore = extendDatastore(components.datastore, 'test')

    await datastore.put(new Key('key'), uint8ArrayFromString('value'))

    const subDatastore = extendDatastore(extendDatastore(datastore, 'a'), 'b/c')
    await subDatastore.put(new Key('d/e'), uint8ArrayFromString('test'))

    const out = await fs.readdir(datastorePath, { recursive: true })

    assert.deepEqual(out, [
      'a',
      'key.data',
      'a/b',
      'a/b/c',
      'a/b/c/d',
      'a/b/c/d/e.data'
    ])

    const data1 = await fs.readFile(Path.join(datastorePath, 'key.data'))
    const data2 = await fs.readFile(Path.join(datastorePath, 'a/b/c/d/e.data'))

    assert.deepEqual(new Uint8Array(data1), uint8ArrayFromString('value'))
    assert.deepEqual(new Uint8Array(data2), uint8ArrayFromString('test'))

    await components.stop()
  })
})
