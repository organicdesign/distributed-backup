import setupCommon from './common/index.js'
import { createLogger } from './logger.js'
import setupFilesystem from '@/modules/filesystem/index.js'
import setupRevisions from '@/modules/revisions/index.js'
import setupScheduler from '@/modules/scheduler/index.js'

const logger = createLogger('system')

logger.info('starting...')

// Setup all the modules
const components = await setupCommon()

await Promise.all([
  setupScheduler(components),
  setupFilesystem(components),
  setupRevisions(components)
])

process.on('SIGINT', () => {
  components.controller.abort()
})

logger.info('started')
