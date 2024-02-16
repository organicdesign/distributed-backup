import { Key } from 'interface-datastore'
import { groups as logger } from 'logger'
import { Manifest } from 'welo/manifest/index'
import { decodeCbor } from 'welo/utils/block'
import type { KeyvalueDB } from './interface.js'
import type { Pair } from '@/interface.js'
import type { Startable } from '@libp2p/interfaces/startable'
import type { Datastore } from 'interface-datastore'
import type { CID } from 'multiformats/cid'
import type { Welo } from 'welo'
import type { ManifestData } from 'welo/manifest/interface'

export interface Components {
  datastore: Datastore
  welo: Welo
}

export class Groups implements Startable {
  private readonly welo: Welo
  private readonly datastore: Datastore
  private readonly groups = new Map<string, KeyvalueDB>()
  private started = false

  constructor (components: Components) {
    this.welo = components.welo
    this.datastore = components.datastore
  }

  isStarted (): boolean {
    return this.started
  }

  async start (): Promise<void> {
    if (this.started) {
      return
    }

    for await (const pair of this.datastore.query({})) {
      const block = await decodeCbor<ManifestData>(pair.value)
      const manifest = Manifest.asManifest({ block })

      if (manifest == null) {
        continue
      }

      await this.add(manifest)
    }

    this.started = true
  }

  async stop (): Promise<void> {
    this.groups.clear()
    this.started = false
  }

  async add (manifest: Manifest): Promise<void> {
    const database = await this.welo.open(manifest) as KeyvalueDB

    this.groups.set(manifest.address.cid.toString(), database)

    await this.datastore.put(new Key(database.address.cid.toString()), database.manifest.block.bytes)

    logger(`[join] ${manifest.address.cid.toString()}`)
  }

  get (group: CID): KeyvalueDB | undefined {
    return this.groups.get(group.toString())
  }

  * all (): Iterable<Pair<string, KeyvalueDB>> {
    for (const [key, value] of this.groups.entries()) {
      yield { key, value }
    }
  }
}

export const createGroups = async (components: Components): Promise<Groups> => {
  const groups = new Groups(components)

  await groups.start()

  return groups
}
