import Path from 'path'
import type { Provides } from '../../src/modules/argv/index.js'
import { testPath } from '../utils/paths.js'

const provs = async (): Promise<Provides> => {
  return {
    key: Path.join(testPath, 'key.json'),
    config: Path.join(testPath, 'config.json'),
    socket: Path.join(testPath, 'server.socket')
  }
}

export default provs
