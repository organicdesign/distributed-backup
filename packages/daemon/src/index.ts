import fs from 'fs/promises'
import Path from 'path'
import * as logger from 'logger'
import { hideBin } from 'yargs/helpers'
import yargs from 'yargs/yargs'
import { projectPath } from './utils.js'
import setupBase from '@/modules/base/index.js'
import setupDownloader from '@/modules/downloader/index.js'
import setupFilesystem from '@/modules/filesystem/index.js'
import setupGroups from '@/modules/groups/index.js'
import setupNetwork from '@/modules/network/index.js'
import setupRevisions from '@/modules/revisions/index.js'
import setupRPC from '@/modules/rpc/index.js'
import setupTick from '@/modules/tick/index.js'

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

const raw = await fs.readFile(argv.config, { encoding: 'utf8' })
const config = JSON.parse(raw)

// Setup all the modules

logger.lifecycle('loaded config')

const base = await setupBase({}, { config, key: argv.key })
const tick = await setupTick({}, { config })
const rpc = await setupRPC({}, { socket: argv.socket })

const network = await setupNetwork({
  base: base.components,
  rpc: rpc.components
}, { config })

const groups = await setupGroups({
  base: base.components,
  network: network.components,
  rpc: rpc.components
}, { config })

const downloader = await setupDownloader({
  base: base.components,
  network: network.components,
  rpc: rpc.components,
  tick: tick.components
}, { config })

const filesystem = await setupFilesystem({
  base: base.components,
  network: network.components,
  groups: groups.components,
  downloader: downloader.components,
  tick: tick.components,
  rpc: rpc.components
}, { config })

await setupRevisions({
  base: base.components,
  network: network.components,
  groups: groups.components,
  filesystem: filesystem.components,
  rpc: rpc.components
}, { config })

let exiting = false

process.on('SIGINT', () => {
  if (exiting) {
    logger.lifecycle('force exiting')
    process.exit(1)
  }

  exiting = true

  ;(async () => {
    logger.lifecycle('cleaning up...')
    logger.lifecycle('stopped server')

    logger.lifecycle('exiting...')

    process.exit()
  })().catch(error => {
    throw error
  })
})

logger.lifecycle('started')
