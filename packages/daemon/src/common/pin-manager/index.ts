import { Key, type Datastore } from 'interface-datastore'
import all from 'it-all'
import { Event, EventTarget } from 'ts-event-target'
import { encodePinInfo, decodePinInfo } from './utils.js'
import type { PinInfo } from './interface.js'
import type { Pair } from '@/interface.js'
import type { BlockInfo, PinManager as HeliaPinManager } from '@organicdesign/db-helia-pin-manager'
import type { CID } from 'multiformats/cid'

type EventTypes = 'reference:removed'

export class PinManagerEvent extends Event<EventTypes> {
  readonly key: string
  readonly priority: number
  readonly cid: CID

  constructor (type: EventTypes, data: { key: string } & PinInfo) {
    super(type)

    this.key = data.key
    this.cid = data.cid
    this.priority = data.priority
  }
}

export class PinManager {
  private readonly datastore: Datastore
  private readonly pinManager: HeliaPinManager
  readonly events = new EventTarget<[PinManagerEvent]>()

  constructor (components: { datastore: Datastore, pinManager: HeliaPinManager }) {
    this.datastore = components.datastore
    this.pinManager = components.pinManager
  }

  async put (key: string, pinInfo: PinInfo): Promise<void> {
    const data = encodePinInfo(pinInfo)

    // Need to ensure that the references get updated.
    await this.remove(key)

    await this.pinManager.pin(pinInfo.cid)

    await this.datastore.put(new Key(key), data)
  }

  async has (key: string, cid?: CID): Promise<boolean> {
    const pinInfo = await this.get(key)

    if (pinInfo == null) {
      return false
    }

    if (cid == null) {
      return true
    }

    return pinInfo.cid.equals(cid)
  }

  async * getActive (): AsyncGenerator<Pair<string, PinInfo>> {
    for (const pin of await this.pinManager.getActiveDownloads()) {
      yield * this.getByPin(pin)
    }
  }

  async download (pin: CID, options?: { limit: number }): Promise<Array<() => Promise<BlockInfo>>> {
    return this.pinManager.downloadHeads(pin, options)
  }

  async getStatus (cid: CID): Promise<'COMPLETED' | 'DOWNLOADING' | 'DESTROYED' | 'UPLOADING' | 'NOTFOUND'> {
    return this.pinManager.getStatus(cid)
  }

  async getSpeed (cid: CID, range?: number): Promise<number> {
    return this.pinManager.getSpeed(cid, range)
  }

  async getState (cid: CID): Promise<{ size: number, blocks: number }> {
    return this.pinManager.getState(cid)
  }

  async remove (key: string): Promise<void> {
    const pinInfo = await this.get(key)

    if (pinInfo == null) {
      return
    }

    const keys = await all(this.getByPin(pinInfo.cid))

    // If we only have 1 reference be sure to unpin it.
    if (keys.length <= 1) {
      await this.pinManager.unpin(pinInfo.cid)
    }

    this.events.dispatchEvent(new PinManagerEvent('reference:removed', { key, ...pinInfo }))

    await this.datastore.delete(new Key(key))
  }

  async get (key: string): Promise<PinInfo | null> {
    try {
      const data = await this.datastore.get(new Key(key))

      return decodePinInfo(data)
    } catch (error) {
      return null
    }
  }

  private async * getByPin (pin: CID): AsyncGenerator<Pair<string, PinInfo>> {
    const itr = this.datastore.query({
      filters: [({ value }) => {
        const pinInfo = decodePinInfo(value)

        if (pinInfo == null) {
          return false
        }

        return pinInfo.cid.equals(pin)
      }]
    })

    for await (const pair of itr) {
      const pinInfo = decodePinInfo(pair.value)

      if (pinInfo == null) {
        await this.datastore.delete(pair.key)
        continue
      }

      yield { key: pair.key.toString(), value: pinInfo }
    }
  }
}
