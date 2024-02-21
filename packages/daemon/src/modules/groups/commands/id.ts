import { ID } from 'rpc-interfaces'
import { toString as uint8ArrayToString } from 'uint8arrays'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(ID.name, async (): Promise<ID.Return> => {
    return uint8ArrayToString(context.welo.identity.id, 'base58btc')
  })
}

export default command
