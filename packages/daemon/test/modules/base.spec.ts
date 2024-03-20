import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { MemoryBlockstore } from 'blockstore-core'
import { MemoryDatastore } from 'datastore-core'
import { fromString as uint8ArrayFromString } from 'uint8arrays'
import base from '../../src/modules/base/index.js'
import mockArgv from './mock-argv.js'
import mockConfig from './mock-config.js'
import type { Provides as Argv } from '../../src/modules/argv/index.js'

const parseStr = (data: string): Uint8Array => uint8ArrayFromString(data, 'base64')

describe('base', () => {
  let argv: Argv

  before(async () => {
    argv = await mockArgv()

    await fs.mkdir(Path.join(argv.key, '..'), { recursive: true })

    await fs.writeFile(argv.key, JSON.stringify({
      key: '5TP9VimJU1WdSoTxZGLhSuPKqCpXirPHDK4ZjHxzetex-8zAV14C4oLe4dytUSVzznTuQ659pY1dSMG8HAQenDqVQ',
      psk: '/key/swarm/psk/1.0.0/\n/base16/\n56d3c18282f1f1b1b3e04e40dd5d8bf44cafa8bc9c9bc7c57716a7766fa2c550'
    }))
  })

  after(async () => {
    await fs.rm(Path.join(argv.key, '..'), { recursive: true })
  })

  it('returns the key manager', async () => {
    const m = await base({
      config: mockConfig({ storage: ':memory:' }),
      argv
    })

    assert.deepEqual(
      new Uint8Array(m.keyManager.aesKey),
      parseStr('knUGn6uUeQcoxfM1qAtg3F/Njm4bp+GcZK257NZ5AtE')
    )

    assert.deepEqual(
      new Uint8Array(m.keyManager.hmacKey),
      parseStr('KZkJfNz3bRrn6XHvWYtD4+dXvmhdT4TBhBIkWn8y3jY')
    )

    assert.deepEqual(
      (await m.keyManager.getWeloIdentity()).id,
      parseStr('CAISIQPSvjmKINqJY5SA/3c+kadFmIsHeTXtTJYlrooZ53DTUg')
    )

    assert.deepEqual(
      (await m.keyManager.getPeerId()).toBytes(),
      parseStr('ACUIAhIhA5m2/DfXxqi0i+fyYixRaWGirDEVemxUEv8WMZPwFPZB')
    )

    assert.deepEqual(
      m.keyManager.getPskKey(),
      parseStr('L2tleS9zd2FybS9wc2svMS4wLjAvCi9iYXNlMTYvCjU2ZDNjMTgyODJmMWYxYjFiM2UwNGU0MGRkNWQ4YmY0NGNhZmE4YmM5YzliYzdjNTc3MTZhNzc2NmZhMmM1NTA')
    )
  })

  it('uses memory blockstore when memory is specified', async () => {
    const m = await base({
      config: mockConfig({ storage: ':memory:' }),
      argv
    })

    assert(m.blockstore instanceof MemoryBlockstore)
  })

  it('uses memory datastore when memory is specified', async () => {
    const m = await base({
      config: mockConfig({ storage: ':memory:' }),
      argv
    })

    assert(m.datastore instanceof MemoryDatastore)
  })
})
