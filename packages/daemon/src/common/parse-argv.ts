import Path from 'path'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import { projectPath } from '@/utils.js'

export default async () => {
  const argv = await yargs(hideBin(process.argv))
    .option({
      socket: {
        alias: 's',
        type: 'string',
        default: '/tmp/server.socket'
      }
    })
    .option({
      key: {
        alias: 'k',
        type: 'string',
        default: Path.join(projectPath, 'config/key.json')
      }
    })
    .option({
      config: {
        alias: 'c',
        type: 'string',
        default: Path.join(projectPath, 'config/config.json')
      }
    })
    .parse()

  return {
    socket: Path.resolve(argv.socket),
    key: Path.resolve(argv.key),
    config: Path.resolve(argv.config)
  }
}
