import * as logger from 'logger'
import setupArgv from '@/modules/argv/index.js'
import setupBase from '@/modules/base/index.js'
import setupConfig from '@/modules/config/index.js'
import setupDownloader from '@/modules/downloader/index.js'
import setupFilesystem from '@/modules/filesystem/index.js'
import setupGroups from '@/modules/groups/index.js'
import setupNetwork from '@/modules/network/index.js'
import setupRevisions from '@/modules/revisions/index.js'
import setupRPC from '@/modules/rpc/index.js'
import setupTick from '@/modules/tick/index.js'

logger.lifecycle('starting...')

// Setup all the modules

logger.lifecycle('loaded config')

const argv = await setupArgv()

const config = await setupConfig({ argv: argv.components })
const rpc = await setupRPC({ argv: argv.components })

const tick = await setupTick({ config: config.components })
const base = await setupBase({ argv: argv.components, config: config.components })

const network = await setupNetwork({
  config: config.components,
  base: base.components,
  rpc: rpc.components
})

const groups = await setupGroups({
  base: base.components,
  network: network.components,
  rpc: rpc.components
})

const downloader = await setupDownloader({
  config: config.components,
  base: base.components,
  network: network.components,
  rpc: rpc.components,
  tick: tick.components
})

const filesystem = await setupFilesystem({
  config: config.components,
  base: base.components,
  network: network.components,
  groups: groups.components,
  downloader: downloader.components,
  tick: tick.components,
  rpc: rpc.components
})

await setupRevisions({
  config: config.components,
  base: base.components,
  network: network.components,
  groups: groups.components,
  filesystem: filesystem.components,
  rpc: rpc.components
})

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
