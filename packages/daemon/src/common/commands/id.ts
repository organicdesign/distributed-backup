import { ID } from '@organicdesign/db-rpc-interfaces'
import { toString as uint8ArrayToString } from 'uint8arrays'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ rpcServer, welo }) => {
  rpcServer.rpc.addMethod(ID.name, async (): Promise<ID.Return> => {
    return uint8ArrayToString(welo.identity.id, 'base58btc')
  })
}

export default command
