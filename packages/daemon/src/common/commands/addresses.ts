import { Addresses } from '@organicdesign/db-rpc-interfaces'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ rpcServer, libp2p }) => {
  rpcServer.rpc.addMethod(Addresses.name, async (): Promise<Addresses.Return> => {
    return libp2p.getMultiaddrs().map(a => a.toString())
  })
}

export default command
