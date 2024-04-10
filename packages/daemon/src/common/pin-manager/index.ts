import { Key, type Datastore } from 'interface-datastore'
import all from 'it-all'
import { Event, EventTarget } from 'ts-event-target'
import { encodePinInfo, decodePinInfo } from './utils.js'
import type { PinInfo } from './interface.js'
import type { Pair } from '@/interface.js'
import type { BlockInfo, PinManager as HeliaPinManager, PinState } from '@organicdesign/db-helia-pin-manager'
import type { AbortOptions } from 'interface-store'
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

  async put (key: string, pinInfo: PinInfo, options: AbortOptions = {}): Promise<void> {
    const data = encodePinInfo(pinInfo)

    // Need to ensure that the references get updated.
    await this.remove(key, options)

    await this.pinManager.pin(pinInfo.cid, options)

    await this.datastore.put(new Key(key), data, options)
  }

  async has (key: string, cid?: CID, options: AbortOptions = {}): Promise<boolean> {
    const pinInfo = await this.get(key, options)

    if (pinInfo == null) {
      return false
    }

    if (cid == null) {
      return true
    }

    return pinInfo.cid.equals(cid)
  }

  async * getActive (options: AbortOptions = {}): AsyncGenerator<Pair<string, PinInfo>> {
    for (const pin of await this.pinManager.getActiveDownloads(options)) {
      yield * this.getByPin(pin, options)
    }
  }

  async download (pin: CID, options: { limit?: number } & AbortOptions = {}): Promise<Array<(options?: AbortOptions) => Promise<BlockInfo>>> {
    return this.pinManager.downloadHeads(pin, options)
  }

  async getStatus (cid: CID, options: AbortOptions = {}): Promise<'COMPLETED' | 'DOWNLOADING' | 'DESTROYED' | 'UPLOADING' | 'NOTFOUND'> {
    return this.pinManager.getStatus(cid, options)
  }

  async getSpeed (cid: CID, options: { range?: number } & AbortOptions = {}): Promise<number> {
    return this.pinManager.getSpeed(cid, options)
  }

  async getState (cid: CID, options: AbortOptions = {}): Promise<PinState> {
    return this.pinManager.getState(cid, options)
  }

  async remove (key: string, options: AbortOptions = {}): Promise<void> {
    const pinInfo = await this.get(key, options)

    if (pinInfo == null) {
      return
    }

    const keys = await all(this.getByPin(pinInfo.cid, options))

    // If we only have 1 reference be sure to unpin it.
    if (keys.length <= 1) {
      await this.pinManager.unpin(pinInfo.cid, options)
    }

    this.events.dispatchEvent(new PinManagerEvent('reference:removed', { key, ...pinInfo }))

    await this.datastore.delete(new Key(key), options)
  }

  async get (key: string, options: AbortOptions = {}): Promise<PinInfo | null> {
    try {
      const data = await this.datastore.get(new Key(key), options)

      return decodePinInfo(data)
    } catch (error) {
      return null
    }
  }

  private async * getByPin (pin: CID, options: AbortOptions = {}): AsyncGenerator<Pair<string, PinInfo>> {
    const itr = this.datastore.query({
      filters: [({ value }) => {
        const pinInfo = decodePinInfo(value)

        if (pinInfo == null) {
          return false
        }

        return pinInfo.cid.equals(pin)
      }]
    }, options)

    for await (const pair of itr) {
      const pinInfo = decodePinInfo(pair.value)

      if (pinInfo == null) {
        await this.datastore.delete(pair.key, options)
        continue
      }

      yield { key: pair.key.toString(), value: pinInfo }
    }
  }
}
