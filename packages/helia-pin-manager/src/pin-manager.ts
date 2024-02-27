import { DeferredPromise } from '@open-draft/deferred-promise'
import { defaultDagWalkers } from '@organicdesign/db-dag-walkers'
import { NamespaceDatastore } from '@organicdesign/db-namespace-datastore'
import { Key, type Datastore } from 'interface-datastore'
import all from 'it-all'
import { Event, EventTarget } from 'ts-event-target'
import Blocks from './blocks.js'
import Downloads, { type Download } from './downloads.js'
import Pins, { type Pin } from './pins.js'
import { addBlockRef, addPinRef } from './utils.js'
import type { DAGWalker, Helia } from '@helia/interface'
import type { CID } from 'multiformats/cid'

const dagWalkers = defaultDagWalkers()

const getDagWalker = (cid: CID): DAGWalker => {
  const dagWalker = Object.values(dagWalkers).find(dw => dw.codec === cid.code)

  if (dagWalker == null) {
    throw new Error(`No dag walker found for cid codec ${cid.code}`)
  }

  return dagWalker
}

export interface Components {
  helia: Helia
  datastore: Datastore
}

export interface BlockInfo {
  block: Uint8Array
  cid: CID
  links: CID[]
}

export type EventTypes = 'pins:removed' | 'pins:added' | 'pins:adding' | 'downloads:added' | 'downloads:removed' | 'blocks:added' | 'blocks:removed'

class CIDEvent extends Event<EventTypes> {
  cid: CID

  constructor (type: EventTypes, cid: CID) {
    super(type)
    this.cid = cid
  }
}

export class PinManager {
  readonly events = new EventTarget<[CIDEvent]>()
  private readonly helia: Helia
  private readonly activeDownloads = new Map<string, Promise<{ block: Uint8Array, cid: CID, links: CID[] }>>()
  private readonly pins: Pins
  private readonly blocks: Blocks
  private readonly downloads: Downloads

  constructor ({ helia, datastore }: Components) {
    this.helia = helia
    this.pins = new Pins(new NamespaceDatastore(datastore, new Key('pins')))
    this.blocks = new Blocks(new NamespaceDatastore(datastore, new Key('blocks')))
    this.downloads = new Downloads(new NamespaceDatastore(datastore, new Key('downloads')))
  }

  async all (): Promise<Array<Pin & { cid: CID }>> {
    return all(this.pins.all())
  }

  async unpin (cid: CID): Promise<void> {
    const pin = await this.pins.get(cid)

    if (pin != null) {
      await this.pins.put(cid, { state: 'DESTROYED', depth: pin.depth })
    }

    try {
      await all(this.helia.pins.rm(cid))
    } catch (error) {
      if ((error as { code: string }).code !== 'ERR_NOT_FOUND') {
        throw error
      }
    }

    const [downloads, blocks] = await Promise.all([
      all(this.downloads.all(cid)),
      all(this.blocks.all(cid))
    ])

    await Promise.all([
      this.pins.delete(cid),
      ...downloads.map(async d => this.downloads.delete(d.pinnedBy, d.cid)),
      ...blocks.map(async b => this.blocks.delete(b.pinnedBy, b.cid))
    ])

    this.events.dispatchEvent(new CIDEvent('pins:removed', cid))
  }

  /**
   * Pin a CID without downloading any blocks. This will throw an error if all the blocks don't exist locally.
   */
  async pinLocal (cid: CID): Promise<void> {
    this.events.dispatchEvent(new CIDEvent('pins:adding', cid))

    const pin = await this.pins.getOrPut(cid, {
      state: 'UPLOADING',
      depth: Number.MAX_SAFE_INTEGER
    })

    if (pin == null) {
      throw new Error('pin find or create failed')
    }

    const walk = async (subCid: CID, depth: number): Promise<void> => {
      const dagWalker = getDagWalker(subCid)

      if (!await this.helia.blockstore.has(subCid)) {
        throw new Error('pin does not exist locally')
      }

      await addBlockRef(this.helia, subCid, cid)

      const block = await this.helia.blockstore.get(subCid)

      await this.blocks.getOrPut(cid, subCid, {
        size: block.length,
        depth
      })

      for await (const cid of dagWalker.walk(block)) {
        await walk(cid, depth + 1)
      }
    }

    await walk(cid, 0)

    await addPinRef(this.helia, cid)

    await this.pins.put(cid, {
      ...pin,
      state: 'COMPLETED'
    })

    this.events.dispatchEvent(new CIDEvent('pins:added', cid))
  }

  // Add a pin to the downloads.
  async pin (cid: CID): Promise<void> {
    const pin = await this.pins.get(cid)

    if (pin != null) {
      return
    }

    const depth = Number.MAX_SAFE_INTEGER

    await this.pins.put(cid, { depth, state: 'DOWNLOADING' })
    await this.downloads.getOrPut(cid, cid, { depth })

    this.events.dispatchEvent(new CIDEvent('pins:adding', cid))
  }

  /**
   * Get the current state of the pin.
   */
  async getState (cid: CID): Promise<Pin['state'] | 'NOTFOUND'> {
    const pin = await this.pins.get(cid)

    return pin == null ? 'NOTFOUND' : pin.state
  }

  // Get all the pins that are actively downloading.
  async getActiveDownloads (): Promise<CID[]> {
    const cids: CID[] = []

    for await (const pin of this.pins.all()) {
      if (pin.state === 'DOWNLOADING') {
        cids.push(pin.cid)
      }
    }

    return cids
  }

  /**
   * Get all the download heads for a given pin.
   */
  async getHeads (pin: CID, options?: Partial<{ limit: number }>): Promise<Array<Download & { cid: CID, pinnedBy: CID }>> {
    const downloads: Array<Download & { cid: CID, pinnedBy: CID }> = []
    let count = 0

    for await (const download of this.downloads.all(pin)) {
      downloads.push(download)
      count++

      if (options?.limit != null && count >= options?.limit) {
        break
      }
    }

    return downloads
  }

  /**
   * Get the size on disk for a given pin.
   */
  async getSize (pin: CID): Promise<number> {
    const blocks = await all(this.blocks.all(pin))

    return blocks.reduce((c, b) => b.size + c, 0)
  }

  async getBlockCount (pin: CID): Promise<number> {
    const { length } = await all(this.blocks.all(pin))

    return length
  }

  /**
   * Similar to `downloadPin` but only returns pins that are availible now.
   */
  async downloadSync (pin: CID, options?: Partial<{ limit: number }>): Promise<Array<() => Promise<BlockInfo>>> {
    const pinData = await this.pins.get(pin)

    if (pinData == null) {
      throw new Error('no such pin')
    }

    if (pinData.state === 'COMPLETED') {
      return []
    }

    const heads = await this.getHeads(pin, options)

    // Filter the heads that are already downloading.
    return heads
      .filter(head => !this.activeDownloads.has(head.cid.toString()))
      .map(head => async () => {
        const downloadResult = await this.download(head.cid)
        const heads = await this.getHeads(pin, { limit: 1 })

        if (heads.length === 0) {
          await addPinRef(this.helia, pin)

          const isCompleted = pinData.state === 'COMPLETED'

          if (!isCompleted) {
            await this.pins.put(pin, {
              ...pinData,
              state: 'COMPLETED'
            })

            this.events.dispatchEvent(new CIDEvent('pins:added', pin))
          }
        }

        return downloadResult
      })
  }

  // Download an entire pin.
  async * downloadPin (pin: CID): AsyncGenerator<() => Promise<BlockInfo>> {
    const pinData = await this.pins.get(pin)

    if (pinData == null) {
      throw new Error('no such pin')
    }

    if (pinData.state === 'COMPLETED') {
      return
    }

    const queue: Array<() => Promise<BlockInfo>> = []

    const enqueue = (cid: CID, depth: number): void => {
      queue.push(async () => {
        const { links, block } = await this.download(cid)

        if (pinData.depth == null || depth < pinData.depth) {
          for (const cid of links) {
            enqueue(cid, depth + 1)
          }
        }

        return { cid, block, links }
      })
    }

    const heads = await this.getHeads(pin)

    for (const head of heads) {
      enqueue(head.cid, head.depth)
    }

    const promises: Array<Promise<{ cid: CID, block: Uint8Array }>> = []

    while (queue.length + promises.length !== 0) {
      const func = queue.shift()

      if (func == null) {
        await promises.shift()

        continue
      }

      const promise = new DeferredPromise<{ cid: CID, block: Uint8Array }>()

      promises.push(promise)

      yield async () => {
        const value = await func()
        promise.resolve(value)

        return value
      }
    }

    await addPinRef(this.helia, pin)

    await this.pins.put(pin, {
      ...pinData,
      state: 'COMPLETED'
    })

    this.events.dispatchEvent(new CIDEvent('pins:added', pin))
  }

  // Download an individial block.
  private async download (cid: CID): Promise<BlockInfo> {
    // Check if we are already downloading this.
    const activePromise = this.activeDownloads.get(cid.toString())

    if (activePromise != null) {
      return activePromise
    }

    const promise = (async () => {
      // Download the block and fetch the downloads referencing it.
      const [downloads, block] = await Promise.all([
        all(this.downloads.allByCid(cid)),
        this.helia.blockstore.get(cid, { signal: AbortSignal.timeout(10000) })
      ])

      for (const d of downloads) {
        await addBlockRef(this.helia, cid, d.pinnedBy)
      }

      // Save the blocks to the database.
      await Promise.all(downloads.map(async d => this.blocks.getOrPut(d.pinnedBy, cid, {
        depth: d.depth,
        size: block.length
      })))

      // Add the next blocks to download.
      const dagWalker = getDagWalker(cid)
      const promises: Array<Promise<unknown>> = []
      const links: CID[] = []

      for await (const cid of dagWalker.walk(block)) {
        for (const d of downloads) {
          promises.push((async () => {
            const pin = await this.pins.get(d.pinnedBy)

            if (pin?.depth != null && pin.depth <= d.depth) {
              return
            }

            links.push(cid)

            await this.downloads.getOrPut(d.pinnedBy, cid, {
              depth: d.depth + 1
            })
          })())
        }
      }

      await Promise.all(promises)

      // Delete the download references
      await Promise.all(downloads.map(async d => this.downloads.delete(d.pinnedBy, d.cid)))

      this.events.dispatchEvent(new CIDEvent('downloads:added', cid))

      return { block, cid, links }
    })()

    this.activeDownloads.set(cid.toString(), promise)

    try {
      const data = await promise

      this.activeDownloads.delete(cid.toString())

      return data
    } catch (error) {
      this.activeDownloads.delete(cid.toString())
      throw error
    }
  }
}
