import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { KeyManager } from '@organicdesign/db-key-manager'
import { CID } from 'multiformats/cid'
import createDownloader from '../../src/modules/downloader/index.js'
import createFilesystem from '../../src/modules/filesystem/index.js'
import createGroups from '../../src/modules/groups/index.js'
import createNetwork from '../../src/modules/network/index.js'
import createRpc from '../../src/modules/rpc/index.js'
import createSigint from '../../src/modules/sigint/index.js'
import createTick from '../../src/modules/tick/index.js'
import { createGroup } from '../utils/create-group.js'
import { generateKey } from '../utils/generate-key.js'
import { mkTestPath } from '../utils/paths.js'
import mockArgv from './mock-argv.js'
import mockBase from './mock-base.js'
import mockConfig from './mock-config.js'
import type { Provides as FSProvides } from '../../src/modules/filesystem/index.js'

describe('filesystem', () => {
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
})
