import assert from 'assert/strict'
import Path from 'path'
import parseArgv from '../../src/common/parse-argv.js'
import { projectPath } from '@/utils.js'

describe('argv', () => {
  it('returns defaults for every argv parameter', async () => {
    const argv = await parseArgv()

    assert.equal(argv.key, Path.join(projectPath, 'config/key.json'))
    assert.equal(argv.config, Path.join(projectPath, 'config/config.json'))
    assert.equal(argv.socket, '/tmp/server.socket')
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

    const argv = await parseArgv()

    assert.equal(argv.key, key)
    assert.equal(argv.socket, socket)
		assert.equal(argv.config, config)
  })
})
