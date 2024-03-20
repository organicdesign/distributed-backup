import { createLogger } from './logger.js'
import setupArgv from '@/modules/argv/index.js'
import setupBase from '@/modules/base/index.js'
import setupConfig from '@/modules/config/index.js'
import setupDownloader from '@/modules/downloader/index.js'
import setupFilesystem from '@/modules/filesystem/index.js'
import setupGroups from '@/modules/groups/index.js'
import setupNetwork from '@/modules/network/index.js'
import setupRevisions from '@/modules/revisions/index.js'
import setupRPC from '@/modules/rpc/index.js'
import setupScheduler from '@/modules/scheduler/index.js'
import setupSigint from '@/modules/sigint/index.js'
import setupSneakernet from '@/modules/sneakernet/index.js'
import setupTick from '@/modules/tick/index.js'

const logger = createLogger('system')

logger.info('starting...')

// Setup all the modules
const argv = await setupArgv()

const sigint = await setupSigint()
const config = await setupConfig({ argv })
const rpc = await setupRPC({ argv, sigint })
const tick = await setupTick({ config, sigint })
const base = await setupBase({ argv, config })
const network = await setupNetwork({ sigint, config, base, rpc })
const groups = await setupGroups({ sigint, base, network, rpc })
const downloader = await setupDownloader({ config, base, network, rpc, tick, sigint })

await setupSneakernet({ base, groups, rpc, network })
await setupScheduler({ base, groups, rpc })

const filesystem = await setupFilesystem({
  config,
  base,
  network,
  groups,
  downloader,
  tick,
  rpc
})

await setupRevisions({
  config,
  base,
  network,
  groups,
  filesystem,
  downloader,
  tick,
  rpc
})

logger.info('started')
