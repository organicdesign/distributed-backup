import { Downloader } from '@organicdesign/db-rpc-interfaces'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ rpcServer, downloader }) => {
  rpcServer.rpc.addMethod(Downloader.name, async (raw: unknown): Promise<Downloader.Return> => {
    const params = Downloader.Params.parse(raw)

    if (params.pause === true) {
      downloader.pause()
    } else if (params.pause === false) {
      downloader.resume()
    }

    return null
  })
}

export default command
