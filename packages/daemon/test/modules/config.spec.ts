import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { z } from 'zod'
import config from '../../src/modules/config/index.js'
import { mkTestPath } from '../utils/paths.js'

const testPath = mkTestPath('config')
const configPath = Path.join(testPath, 'config.json')

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
  await fs.mkdir(testPath, { recursive: true })
  await fs.writeFile(configPath, JSON.stringify(configData))
})

after(async () => {
  await fs.rm(testPath, { recursive: true })
})

describe('config', () => {
  it('returns parsed config from the file', async () => {
    const m = await config({
      argv: { config: configPath, key: '', socket: '' }
    })

    assert.deepEqual(m.config, configData)
  })

  it('gets config from schema', async () => {
    const m = await config({
      argv: { config: configPath, key: '', socket: '' }
    })

    assert.deepEqual(
      m.get(z.object({ bootstrap: z.array(z.string()) })),
      { bootstrap: configData.bootstrap }
    )

    assert.deepEqual(
      m.get(z.object({ tickInterval: z.number(), private: z.boolean() })),
      { tickInterval: configData.tickInterval, private: configData.private }
    )
  })
})
