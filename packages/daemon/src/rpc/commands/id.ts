import { type ID } from 'rpc-interfaces'
import { toString as uint8ArrayToString } from 'uint8arrays'
import type { Components } from '../../interface.js'

export const name = 'id'

export const method = (components: Components) => async (): Promise<ID.Return> => {
  return uint8ArrayToString(components.welo.identity.id, 'base58btc')
}
