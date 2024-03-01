import fss from 'fs'
import fs from 'fs/promises'
import Path from 'path'
import { Readable } from 'stream'
import { car } from '@helia/car'
import { CarWriter } from '@ipld/car'
import { SneakernetSend } from '@organicdesign/db-rpc-interfaces'
import * as cborg from 'cborg'
import { Key } from 'interface-datastore'
import { CID } from 'multiformats/cid'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { getHeads } from 'welo/utils/replicator'
import { type EncodedPeerData, PeerData } from '../interface.js'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc, network, groups, base }) => {
  rpc.addMethod(SneakernetSend.name, async (raw: unknown): Promise<SneakernetSend.Return> => {
    const params = SneakernetSend.Params.parse(raw)

    const pairs = []

    for await (const { value: database } of groups.groups.all()) {
      pairs.push({
        group: database.address.cid.bytes,
        cids: (await getHeads(database.replica)).map(h => h.bytes)
      })
    }

    const peerData: EncodedPeerData = [{
      id: groups.welo.identity.id,
      wants: [...network.manualBlockBroker.getWants()].map(c => c.bytes),
      heads: pairs
    }]

    const data = cborg.encode(peerData)

    await fs.writeFile(Path.join(params.path, 'manifest'), data)

    // Encode blocks into a car file...
    if (params.peers != null) {
      const blocks: CID[] = []

      const addWants = async (wants: Uint8Array[]): Promise<void> => {
        for (const cidData of wants) {
          const cid = CID.decode(cidData)

          if (await base.blockstore.has(cid)) {
            blocks.push(cid)
          }
        }
      }

      for (const peer of params.peers) {
        try {
          const key = new Key(uint8ArrayFromString(peer, 'base58btc'))
          const data = await context.peerData.get(key)
          const peerData = PeerData.parse(cborg.decode(data))

          await addWants(peerData.wants)
        } catch (error) {
          // Ignore
        }
      }

      if (blocks.length > 0) {
        const c = car(network.helia)
        const writer = await CarWriter.create(blocks)
        const path = Path.join(params.path, 'blocks.car')

        Readable.from(writer.out).pipe(fss.createWriteStream(path))

        await c.export(blocks, writer)
      }
    }

    return null
  })
}

export default command
