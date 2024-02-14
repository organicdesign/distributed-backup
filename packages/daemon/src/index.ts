import fs from 'fs/promises'
import Path from 'path'
import { createNetServer } from '@organicdesign/net-rpc'
import { MemoryBlockstore } from 'blockstore-core'
import { FsBlockstore } from 'blockstore-fs'
import { MemoryDatastore } from 'datastore-core'
import { FsDatastore } from 'datastore-fs'
import { createKeyManager } from 'key-manager'
import * as logger from 'logger'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import { z } from 'zod'
import { projectPath, isMemory } from './utils.js'
import Network from '@/modules/network/index.js'

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

logger.lifecycle('starting...')

const { rpc, close } = await createNetServer(argv.socket)

const raw = await fs.readFile(argv.config, { encoding: 'utf8' })
const json = JSON.parse(raw)

const Config = z.object({
  tickInterval: z.number().default(10 * 60),
  storage: z.string().default(':memory:')
})
  .merge(Network.Config)

const config = Config.parse(json)

const keyManager = await createKeyManager(Path.resolve(argv.key))

const datastore = isMemory(config.storage)
  ? new MemoryDatastore()
  : new FsDatastore(Path.join(config.storage, 'datastore'))

const blockstore = isMemory(config.storage)
  ? new MemoryBlockstore()
  : new FsBlockstore(Path.join(config.storage, 'blockstore'))

// Setup all the modules

logger.lifecycle('loaded config')

const defaultComponents = { config, datastore, blockstore, keyManager }
const networkComponents = await Network.setup()(defaultComponents)

const components = { ...defaultComponents, ...networkComponents }

for (const command of Network.commands) {
  rpc.addMethod(command.name, command.method(components))
}

let exiting = false

process.on('SIGINT', () => {
  if (exiting) {
    logger.lifecycle('force exiting')
    process.exit(1)
  }

  exiting = true

  ;(async () => {
    logger.lifecycle('cleaning up...')
    await close()
    logger.lifecycle('stopped server')

    logger.lifecycle('exiting...')

    process.exit()
  })().catch(error => {
    throw error
  })
})
