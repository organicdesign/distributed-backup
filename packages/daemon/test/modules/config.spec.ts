import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { z } from 'zod'
import parseConfig from '../../src/parse-config.js'
import { mkTestPath } from '../utils/paths.js'
import setup from '@/common/index.js'

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
  it('gets config from file', async () => {
    const config = await parseConfig(configPath)

    assert.deepEqual(config, configData)
  })

  it('parses config from schema', async () => {
    const components = await setup({ config: configData, socket: Path.join(testPath, 'server.socket') })

    assert.deepEqual(
      components.parseConfig(z.object({ bootstrap: z.array(z.string()) })),
      { bootstrap: configData.bootstrap }
    )

    assert.deepEqual(
      components.parseConfig(z.object({ tickInterval: z.number(), private: z.boolean() })),
      { tickInterval: configData.tickInterval, private: configData.private }
    )

    await components.stop()
  })
})
