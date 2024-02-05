import { PinManager as PinManagerClass } from './pin-manager.js'
import setupSequelize from './sequelize.js'
import type { Helia } from '@helia/interface'
import type { Options } from 'sequelize'

export type { BlockInfo, EventTypes } from './pin-manager.js'

export type PinManager = PinManagerClass

export default async (helia: Helia, config: Partial<Pick<Options, 'storage' | 'database'>> = {}): Promise<PinManager> => {
  const components = await setupSequelize(config)

  return new PinManagerClass({ ...components, helia })
}
