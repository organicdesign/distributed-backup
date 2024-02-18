import { PinManager } from './pin-manager.js'
import type { Requires, Provides, Config } from './index.js'
import { extendDatastore } from '@/utils.js'

export default async (components: Requires, config: Config): Promise<Provides> => {
  const pinManager = new PinManager({
    pinManager: components.network.pinManager,
    datastore: extendDatastore(components.base.datastore, 'pin-references')
  })

  return {
    pinManager,
    config,
  }
}
