import { CountPeers } from '@organicdesign/db-rpc-interfaces'
import { CID } from 'multiformats/cid'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ rpcServer, libp2p }) => {
  rpcServer.rpc.addMethod(CountPeers.name, async (raw: unknown): Promise<CountPeers.Return> => {
    const countPeers = async (cid: CID, options?: { timeout: number }): Promise<number> => {
      let count = 0

      const itr = libp2p.contentRouting.findProviders(cid, {
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
    const cid = CID.parse(params.cid)

    return countPeers(cid)
  })
}

export default command
