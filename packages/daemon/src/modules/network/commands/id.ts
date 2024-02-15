import { ID } from 'rpc-interfaces'
import { toString as uint8ArrayToString } from 'uint8arrays'
import type { Provides } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides> = (context) => ({
  name: ID.name,

  async method (): Promise<ID.Return> {
    return uint8ArrayToString(context.welo.identity.id, 'base58btc')
  }
})

export default command
