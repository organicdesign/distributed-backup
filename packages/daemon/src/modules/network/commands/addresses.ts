import { Addresses } from 'rpc-interfaces'
import type { Provides } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides> = (context) => ({
  name: Addresses.name,

  async method (): Promise<Addresses.Return> {
    return context.libp2p.getMultiaddrs().map(a => a.toString())
  }
})

export default command
