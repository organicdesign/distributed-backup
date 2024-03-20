import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import config from '../../src/modules/config/index.js'
import { projectPath } from '@/utils.js'

const configPath = Path.join(projectPath, 'packages/daemon/test-out/config.json')

const configData = {
  private: true,
  tickInterval: 1000,
  storage: ':memory:',
  addresses: [
    '/ip4/0.0.0.0/tcp/0'
  ],
  bootstrap: ['/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN']
}

before(async () => {
  await fs.mkdir(Path.join(configPath, '..'), { recursive: true })
  await fs.writeFile(configPath, JSON.stringify(configData))
})

after(async () => {
  await fs.rm(Path.join(configPath, '..'), { recursive: true })
})

describe('config', () => {
  it('returns parsed config from the file', async () => {
    const m = await config({
      argv: { config: configPath, key: '', socket: '' }
    })

    assert.deepEqual(m.config, configData)
  })
})
