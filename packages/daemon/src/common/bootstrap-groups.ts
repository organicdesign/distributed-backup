import { CID } from 'multiformats/cid'
import { Address } from 'welo'
import { type Components, Config } from './interface.js'
import type { Loggers } from '@/logger.js'

type BootstrapComponents = Pick<Components, 'groups' | 'parseConfig' | 'welo'> & { logger: Loggers }

export default async ({ groups, parseConfig, welo, logger }: BootstrapComponents): Promise<{ stop (): void }> => {
  const config = parseConfig(Config)
  const controller = new AbortController()

  Promise.allSettled(config.groups.map(async group => {
    if (groups.get(CID.parse(group)) != null) {
      return
    }

    try {
      const manifest = await welo.fetch(Address.fromString(`/hldb/${group}`), {
        signal: controller.signal
      })

      await groups.add(manifest)
    } catch (error) {
      logger.warn(`Failed to bootstrap group '${group}'`)
    }
  })).catch(() => {
    // Ignore
  })

  return {
    stop () {
      controller.abort()
    }
  }
}
