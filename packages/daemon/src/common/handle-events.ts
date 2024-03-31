import type { Components } from './interface.js'
import type { Loggers } from '@/logger.js'

export default ({ downloader, heliaPinManager, tick, pinManager, groups }: Components, logger: Loggers): void => {
  groups.events.addEventListener('groups:joined', ({ cid }) => {
    logger.info(`[groups] [join] ${cid.toString()}`)
  })

  heliaPinManager.events.addEventListener('downloads:added', ({ cid }) => {
    logger.info(`[downloads] [+] ${cid}`)
  })

  heliaPinManager.events.addEventListener('pins:added', ({ cid }) => {
    logger.info(`[pins] [+] ${cid}`)
  })

  heliaPinManager.events.addEventListener('pins:adding', ({ cid }) => {
    logger.info(`[pins] [~] ${cid}`)
  })

  heliaPinManager.events.addEventListener('pins:removed', ({ cid }) => {
    logger.info(`[pins] [-] ${cid}`)
  })

  tick.events.addEventListener('method:error', ({ error }) => {
    logger.error('tick: ', error)
  })

  pinManager.events.addEventListener('reference:removed', ({ key }) => {
    logger.info(`[references] [-] ${key}`)
  })

  downloader.events.addEventListener('download:error', ({ error }) => {
    logger.error('downloader: ', error)
  })
}
