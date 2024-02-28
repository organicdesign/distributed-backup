import fs from 'fs/promises'
import Path from 'path'
import { SneakernetSend } from '@organicdesign/db-rpc-interfaces'
import * as cborg from 'cborg'
import { type EncodedPeerData } from '../interface.js'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (_, { rpc, network }) => {
  rpc.addMethod(SneakernetSend.name, async (raw: unknown): Promise<SneakernetSend.Return> => {
    const params = SneakernetSend.Params.parse(raw)

    const peerData: EncodedPeerData = [{
      id: network.libp2p.peerId.toBytes(),
      wants: [...network.manualBlockBroker.getWants()].map(c => c.bytes),
      heads: []
    }]

    const data = cborg.encode(peerData)

    await fs.writeFile(Path.join(params.path, 'manifest'), data)

    return null
  })
}

export default command
