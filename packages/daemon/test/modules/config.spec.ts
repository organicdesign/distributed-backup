import assert from 'assert/strict'
import fs from 'fs/promises'
import Path from 'path'
import { z } from 'zod'
import parseConfig from '../../src/common/parse-config.js'
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
  it('gets config from schema', async () => {
		const getConfig = await parseConfig(configPath)

    assert.deepEqual(
      getConfig(z.object({ bootstrap: z.array(z.string()) })),
      { bootstrap: configData.bootstrap }
    )

    assert.deepEqual(
      getConfig(z.object({ tickInterval: z.number(), private: z.boolean() })),
      { tickInterval: configData.tickInterval, private: configData.private }
    )
  })
})
