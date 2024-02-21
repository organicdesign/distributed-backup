import { Addresses } from 'rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(Addresses.name, async (): Promise<Addresses.Return> => {
    return context.libp2p.getMultiaddrs().map(a => a.toString())
  })
}

export default command
