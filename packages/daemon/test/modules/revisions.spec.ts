import assert from 'assert'
import fs from 'fs/promises'
import Path from 'path'
import { KeyManager } from '@organicdesign/db-key-manager'
import all from 'it-all'
import { CID } from 'multiformats/cid'
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
})
