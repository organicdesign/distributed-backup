import fs from 'fs/promises'
import Path from 'path'
import { SneakernetReveive } from '@organicdesign/db-rpc-interfaces'
import * as cborg from 'cborg'
import { Key } from 'interface-datastore'
import all from 'it-all'
import { EncodedPeerData } from '../interface.js'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(SneakernetReveive.name, async (raw: unknown): Promise<SneakernetReveive.Return> => {
    const params = SneakernetReveive.Params.parse(raw)

    const rawData = await fs.readFile(Path.join(params.path, 'manifest'))
    const data = EncodedPeerData.parse(cborg.decode(rawData))

    await all(context.peerData.putMany(data.map(peerData => ({
      key: new Key(peerData.id),
      value: cborg.encode({
        wants: peerData.wants,
        heads: peerData.heads
      })
    }))))

    return null
  })
}

export default command
