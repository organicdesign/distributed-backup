import fss from 'fs'
import fs from 'fs/promises'
import Path from 'path'
import { Readable } from 'stream'
import { car, type Car } from '@helia/car'
import { CarWriter, CarReader } from '@ipld/car'
import * as cborg from 'cborg'
import { type Datastore, Key } from 'interface-datastore'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { getHeads } from 'welo/utils/replicator'
import { EncodedPeerData, PeerData } from './interface.js'
import type { Groups } from '../groups.js'
import type { KeyvalueDB, Pair } from '@/interface.js'
import type { Helia } from '@helia/interface'
import type { ManualBlockBroker } from '@organicdesign/db-manual-block-broker'
import type { Blockstore } from 'interface-blockstore'
import type { Welo } from 'welo'

export interface Components {
  helia: Helia
  welo: Welo
  datastore: Datastore
  manualBlockBroker: ManualBlockBroker
  groups: Groups
}

export class Sneakernet {
  private readonly datastore: Datastore
  private readonly blockstore: Blockstore
  private readonly id: Uint8Array
  private readonly broker: ManualBlockBroker
  private readonly getGroups: () => Array<Pair<string, KeyvalueDB>>
  private readonly car: Car

  constructor (components: Components) {
    this.datastore = components.datastore
    this.id = components.welo.identity.id
    this.broker = components.manualBlockBroker
    this.getGroups = () => [...components.groups.all()]
    this.car = car(components.helia)
    this.blockstore = components.helia.blockstore
  }

  async export (path: string, peers: string[] = []): Promise<void> {
    await Promise.all([
      this.exportManifest(Path.join(path, 'manifest')),
      this.exportBlocks(Path.join(path, 'blocks.car'), peers)
    ])
  }

  async import (path: string): Promise<void> {
    await Promise.all([
      this.importManifest(Path.join(path, 'manifest')),
      this.importBlocks(Path.join(path, 'blocks.car'))
    ])
  }

  private async importManifest (path: string): Promise<void> {
    const rawData = await fs.readFile(path)
    const data = EncodedPeerData.parse(cborg.decode(rawData))

    await all(this.datastore.putMany(data.map(peerData => ({
      key: new Key(peerData.id),
      value: cborg.encode({
        wants: peerData.wants,
        heads: peerData.heads
      })
    }))))
  }

  private async importBlocks (path: string): Promise<void> {
    try {
      await fs.stat(path)
    } catch (error) {
      // No blocks file - just return.
      return
    }

    const inStream = fss.createReadStream(path)
    const reader = await CarReader.fromIterable(inStream)

    await this.car.import(reader)
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

    if (blocks.length === 0) {
      return
    }

    const { writer, out } = await CarWriter.create(blocks)

    Readable.from(out).pipe(fss.createWriteStream(path))

    await this.car.export(blocks, writer)
  }
}
