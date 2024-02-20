import type { Module } from '@/interface.js'
import Path from 'path'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import { projectPath } from '@/utils.js'

export interface Init extends Record<string, unknown> {}

export interface Requires extends Record<string, unknown> {}

export interface Provides extends Record<string, unknown> {
  socket: string,
	key: string,
	config: string
}

const module: Module<Init, Requires, Provides> = async (_, __) => {
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
    .parse();

  return { components: { socket: argv.socket, key: argv.key, config: argv.config } }
}

export default module
