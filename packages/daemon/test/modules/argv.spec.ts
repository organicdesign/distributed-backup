import assert from 'assert/strict'
import Path from 'path'
import argv from '../../src/modules/argv/index.js'
import { projectPath } from '@/utils.js'

describe('argv', () => {
  it('returns defaults for every argv parameter', async () => {
    const m = await argv()

    assert.equal(m.key, Path.join(projectPath, 'config/key.json'))
    assert.equal(m.config, Path.join(projectPath, 'config/config.json'))
    assert.equal(m.socket, '/tmp/server.socket')
  })

  it('returns the value for every argv parameter', async () => {
    const key = '/key.json'
    const config = '/config.json'
    const socket = '/socket'

    process.argv.push('--key')
    process.argv.push(key)
    process.argv.push('--config')
    process.argv.push(config)
    process.argv.push('--socket')
    process.argv.push(socket)

    const m = await argv()

    assert.equal(m.key, key)
    assert.equal(m.config, config)
    assert.equal(m.socket, socket)
  })
})
