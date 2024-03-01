import fss from 'fs'
import fs from 'fs/promises'
import Path from 'path'
import { car } from '@helia/car'
import { CarReader } from '@ipld/car'
import { SneakernetReveive } from '@organicdesign/db-rpc-interfaces'
import * as cborg from 'cborg'
import { Key } from 'interface-datastore'
import all from 'it-all'
import { EncodedPeerData } from '../interface.js'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc, network }) => {
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

    const path = Path.join(params.path, 'blocks.car')

    try {
      await fs.stat(path)
    } catch (error) {
      // No blocks file - just return.
      return null
    }

    const c = car(network.helia)
    const inStream = fss.createReadStream(path)
    const reader = await CarReader.fromIterable(inStream)

    await c.import(reader)

    return null
  })
}

export default command
