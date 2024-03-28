import setupCommon from './common/index.js'
import { createLogger } from './logger.js'
import parseArgv from './parse-argv.js'
import parseConfig from './parse-config.js'
import setupFilesystem from '@/modules/filesystem/index.js'
import setupRevisions from '@/modules/revisions/index.js'
import setupScheduler from '@/modules/scheduler/index.js'

const logger = createLogger('system')

logger.info('starting...')

const argv = await parseArgv()
const config = await parseConfig(argv.config)

// Setup all the modules
const components = await setupCommon({
  config,
  socket: argv.socket,
  key: argv.key
})

await Promise.all([
  setupScheduler(components),
  setupFilesystem(components),
  setupRevisions(components)
])

process.on('SIGINT', () => {
  void components.stop()
})

logger.info('started')
