import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { KeyManager, parseKeyData } from '@organicdesign/db-key-manager'
import createDownloader from '../../src/modules/downloader/index.js'
import createNetwork from '../../src/modules/network/index.js'
import createRpc from '../../src/modules/rpc/index.js'
import createSigint from '../../src/modules/sigint/index.js'
import { mkTestPath } from '../utils/paths.js'
import mockArgv from './mock-argv.js'
import mockBase from './mock-base.js'
import mockConfig from './mock-config.js'
import type {
  Requires as DownloaderComponents,
  Provides as DownloaderProvides
} from '../../src/modules/downloader/index.js'

describe('downloader', () => {
  const testPath = mkTestPath('groups')

  const create = async (name?: string): Promise<Pick<DownloaderComponents, 'sigint' | 'config'> & {
    argv: ReturnType<typeof mockArgv>
    config: ReturnType<typeof mockConfig>
    rpc: Awaited<ReturnType<typeof createRpc>>
    base: ReturnType<typeof mockBase>
    network: Awaited<ReturnType<typeof createNetwork>>
    downloader: DownloaderProvides
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

    const downloader = await createDownloader({
      sigint,
      base,
      rpc,
      network,
      config
    })

    return {
      argv,
      config,
      sigint,
      rpc,
      base,
      network,
      downloader
    }
  }

  before(async () => {
    await fs.mkdir(testPath, { recursive: true })
  })

  after(async () => {
    await fs.rm(testPath, { recursive: true })
  })

  it('has 20 slots by default', async () => {
    const { downloader: m, sigint } = await create()

    assert.equal(m.config.slots, 20)

    await sigint.interupt()
  })
})
