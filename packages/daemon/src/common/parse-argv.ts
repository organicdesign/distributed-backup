import Path from 'path'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'

export default async (): Promise<{
  socket: string
  key?: string
  config?: string
}> => {
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
        type: 'string'
      }
    })
    .option({
      config: {
        alias: 'c',
        type: 'string'
      }
    })
    .parse()

  return {
    socket: Path.resolve(argv.socket),
    key: argv.key != null ? Path.resolve(argv.key) : undefined,
    config: argv.config != null ? Path.resolve(argv.config) : undefined
  }
}
