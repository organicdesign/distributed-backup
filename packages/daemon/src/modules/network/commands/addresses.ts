import { Addresses } from 'rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides, Requires> = (context, { rpc }) => {
  rpc.register(Addresses.name, async (): Promise<Addresses.Return> => {
    return context.libp2p.getMultiaddrs().map(a => a.toString())
  })
}

export default command
