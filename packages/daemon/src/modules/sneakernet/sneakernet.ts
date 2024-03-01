import fss from 'fs'
import fs from 'fs/promises'
import Path from 'path'
import { Readable } from 'stream'
import { car, type Car } from '@helia/car'
import { CarWriter } from '@ipld/car'
import * as cborg from 'cborg'
import { type Datastore, Key } from 'interface-datastore'
import { CID } from 'multiformats/cid'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { getHeads } from 'welo/utils/replicator'
import { type EncodedPeerData, PeerData } from './interface.js'
import type { Requires } from './index.js'
import type { KeyvalueDB, Pair } from '@/interface.js'
import type { ManualBlockBroker } from '@organicdesign/db-manual-block-broker'
import type { Blockstore } from 'interface-blockstore'

export class Sneakernet {
  private readonly datastore: Datastore
  private readonly blockstore: Blockstore
  private readonly id: Uint8Array
  private readonly broker: ManualBlockBroker
  private readonly getGroups: () => Array<Pair<string, KeyvalueDB>>
  private readonly car: Car

  constructor (components: Requires, datastore: Datastore) {
    this.datastore = datastore
    this.id = components.groups.welo.identity.id
    this.broker = components.network.manualBlockBroker
    this.getGroups = () => [...components.groups.groups.all()]
    this.car = car(components.network.helia)
    this.blockstore = components.base.blockstore
  }

  async export (path: string, peers: string[] = []): Promise<void> {
    await Promise.all([
      this.exportManifest(Path.join(path, 'manifest')),
      this.exportBlocks(Path.join(path, 'blocks.car'), peers)
    ])
  }

  private async exportManifest (path: string): Promise<void> {
    const pairs = await Promise.all(
      this.getGroups().map(async ({ value: database }) => ({
        group: database.address.cid.bytes,
        cids: (await getHeads(database.replica)).map(h => h.bytes)
      }))
    )

    const peerData: EncodedPeerData = [{
      id: this.id,
      wants: [...this.broker.getWants()].map(c => c.bytes),
      heads: pairs
    }]

    const data = cborg.encode(peerData)

    await fs.writeFile(path, data)
  }

  private async exportBlocks (path: string, peers: string[] = []): Promise<void> {
    if (peers.length === 0) {
      return
    }

    const blocks: CID[] = []

    const addWants = async (wants: Uint8Array[]): Promise<void> => {
      for (const cidData of wants) {
        const cid = CID.decode(cidData)

        if (await this.blockstore.has(cid)) {
          blocks.push(cid)
        }
      }
    }

    for (const peer of peers) {
      try {
        const key = new Key(uint8ArrayFromString(peer, 'base58btc'))
        const data = await this.datastore.get(key)
        const peerData = PeerData.parse(cborg.decode(data))

        await addWants(peerData.wants)
      } catch (error) {
        // Ignore
      }
    }

    if (blocks.length > 0) {
      const { writer, out } = await CarWriter.create(blocks)

      Readable.from(out).pipe(fss.createWriteStream(path))

      await this.car.export(blocks, writer)
    }
  }
}
