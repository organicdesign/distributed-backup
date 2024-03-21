import Path from 'path'
import { mkTestPath } from '../utils/paths.js'
import type { Provides } from '../../src/modules/argv/index.js'

const testPath = mkTestPath('argv')

const provs = (): Provides => {
  return {
    key: Path.join(testPath, 'key.json'),
    config: Path.join(testPath, 'config.json'),
    socket: Path.join(testPath, 'server.socket')
  }
}

export default provs
