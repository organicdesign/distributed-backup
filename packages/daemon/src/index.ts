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

const config = await setupConfig({ argv })
const rpc = await setupRPC({ argv })
const tick = await setupTick({ config })
const base = await setupBase({ argv, config })
const network = await setupNetwork({ config, base, rpc })
const groups = await setupGroups({ base, network, rpc })
const downloader = await setupDownloader({ config, base, network, rpc, tick })

const filesystem = await setupFilesystem({
  config,
  base,
  network,
  groups,
  downloader,
  tick,
  rpc
})

const revisions = await setupRevisions({ config, base, network, groups, filesystem, rpc })

let exiting = false

process.on('SIGINT', () => {
  if (exiting) {
    logger.lifecycle('force exiting')
    process.exit(1)
  }

  exiting = true

  ;(async () => {
    logger.lifecycle('cleaning up...')

    for (const module of [
      argv,
      config,
      rpc,
      tick,
      base,
      network,
      groups,
      downloader,
      filesystem,
      revisions
    ]) {
      await module.stop?.()
    }

    logger.lifecycle('exiting...')

    process.exit()
  })().catch(error => {
    throw error
  })
})

logger.lifecycle('started')
