import Path from 'path'
import { testPath } from '../utils/paths.js'
import type { Provides } from '../../src/modules/argv/index.js'

const provs = async (): Promise<Provides> => {
  return {
    key: Path.join(testPath, 'key.json'),
    config: Path.join(testPath, 'config.json'),
    socket: Path.join(testPath, 'server.socket')
  }
}

export default provs
