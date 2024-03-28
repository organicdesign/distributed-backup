import Path from 'path'
import type { Provides } from '../../src/modules/argv/index.js'

const provs = (path: string): Provides => {
  return {
    key: Path.join(path, 'key.json'),
    config: Path.join(path, 'config.json'),
    socket: Path.join(path, 'server.socket')
  }
}

export default provs
