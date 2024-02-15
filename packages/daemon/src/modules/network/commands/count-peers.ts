import { CID } from 'multiformats/cid'
import { CountPeers } from 'rpc-interfaces'
import type { Provides } from '../index.js'
import type { RPCCommandConstructor } from '@/interface.js'

const command: RPCCommandConstructor<Provides> = (context) => {
  const countPeers = async (cid: CID, options?: { timeout: number }): Promise<number> => {
    let count = 0

    const itr = context.libp2p.contentRouting.findProviders(cid, {
      signal: AbortSignal.timeout(options?.timeout ?? 3000)
    })

    try {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _ of itr) {
        count++
      }
    } catch (error) {
      // Do nothing
    }

    return count
  }

  return {
    name: CountPeers.name,

    async method (raw: unknown): Promise<CountPeers.Return> {
      const params = CountPeers.Params.parse(raw)
      const cids = params.cids.map(cid => CID.parse(cid))

      return Promise.all(cids.map(async cid => ({
        cid: cid.toString(),
        peers: await countPeers(cid)
      })))
    }
  }
}

export default command
