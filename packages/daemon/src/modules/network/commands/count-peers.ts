import { CID } from 'multiformats/cid'
import { CountPeers } from 'rpc-interfaces'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(CountPeers.name, async (raw: unknown): Promise<CountPeers.Return> => {
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

    const params = CountPeers.Params.parse(raw)
    const cids = params.cids.map(cid => CID.parse(cid))

    return Promise.all(cids.map(async cid => ({
      cid: cid.toString(),
      peers: await countPeers(cid)
    })))
  })
}

export default command
