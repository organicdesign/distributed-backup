import { walk, getWalker } from '@organicdesign/db-utils/dag'
import { NamespaceDatastore } from 'datastore-core'
import { Key } from 'interface-datastore'
import all from 'it-all'
import { Event, EventTarget } from 'ts-event-target'
import Blocks from './blocks.js'
import Downloads from './downloads.js'
import Pins from './pins.js'
import { addBlockRefs, addPinRef } from './utils.js'
import type { Pin, Download, EventTypes, BlockInfo, Components } from './interface.js'
import type { Helia } from '@helia/interface'
import type { CID } from 'multiformats/cid'

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
  private readonly activeDownloads = new Map<string, Promise<BlockInfo>>()
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
      await this.pins.put(cid, { status: 'DESTROYED', depth: pin.depth })
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
      status: 'UPLOADING',
      depth: Number.MAX_SAFE_INTEGER
    })

    if (pin == null) {
      throw new Error('pin find or create failed')
    }

    for await (const getBlock of walk(this.helia.blockstore, cid, { local: true })) {
      const data = await getBlock()

      await addBlockRefs(this.helia, data.cid, cid)

      await this.blocks.getOrPut(cid, data.cid, {
        size: data.block.length,
        depth: data.depth,
        timestamp: Date.now()
      })

      delete (data as { block?: Uint8Array }).block
    }

    await addPinRef(this.helia, cid)

    await this.pins.put(cid, {
      ...pin,
      status: 'COMPLETED'
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

    await this.pins.put(cid, { depth, status: 'DOWNLOADING' })
    await this.downloads.getOrPut(cid, cid, { depth: 0 })

    this.events.dispatchEvent(new CIDEvent('pins:adding', cid))
  }

  /**
   * Get the current state of the pin.
   */
  async getStatus (cid: CID): Promise<Pin['status'] | 'NOTFOUND'> {
    const pin = await this.pins.get(cid)

    return pin == null ? 'NOTFOUND' : pin.status
  }

  /**
   * Get the download speed in bytes / millisecond.
   */
  async getSpeed (cid: CID, range = 5000): Promise<number> {
    const pin = await this.pins.get(cid)

    if (pin == null || range <= 0) {
      return 0
    }

    const now = Date.now()

    let size = 0

    for await (const block of this.blocks.all(cid)) {
      if (block.timestamp >= now - range && block.timestamp <= now) {
        size += block.size
      }
    }

    const speed = size / range

    return isNaN(speed) ? 0 : speed
  }

  // Get all the pins that are actively downloading.
  async getActiveDownloads (): Promise<CID[]> {
    const cids: CID[] = []

    for await (const pin of this.pins.all()) {
      if (pin.status === 'DOWNLOADING') {
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
  async getState (pin: CID): Promise<{ size: number, blocks: number }> {
    const blocks = await all(this.blocks.all(pin))

    return {
      size: blocks.reduce((c, b) => b.size + c, 0),
      blocks: blocks.length
    }
  }

  /**
   * Similar to `download` but only returns downloads that are availible now.
   */
  async downloadHeads (pin: CID, options?: Partial<{ limit: number }>): Promise<Array<() => Promise<BlockInfo>>> {
    const pinData = await this.pins.get(pin)

    if (pinData == null) {
      throw new Error('no such pin')
    }

    if (pinData.status === 'COMPLETED') {
      return []
    }

    const heads = await this.getHeads(pin, options)

    // Filter the heads that are already downloading.
    return heads
      .filter(head => !this.activeDownloads.has(head.cid.toString()))
      .map(head => async () => {
        const downloadResult = await this.downloadSingle(head.cid)
        const heads = await this.getHeads(pin, { limit: 1 })

        if (heads.length === 0) {
          await addPinRef(this.helia, pin)

          const isCompleted = pinData.status === 'COMPLETED'

          if (!isCompleted) {
            await this.pins.put(pin, {
              ...pinData,
              status: 'COMPLETED'
            })

            this.events.dispatchEvent(new CIDEvent('pins:added', pin))
          }
        }

        return downloadResult
      })
  }

  // Download an entire pin.
  async * download (pin: CID): AsyncGenerator<() => Promise<BlockInfo>, void, undefined> {
    const pinData = await this.pins.get(pin)

    if (pinData == null) {
      throw new Error('no such pin')
    }

    if (pinData.status === 'COMPLETED') {
      return
    }

    for (;;) {
      const downloaders = await this.downloadHeads(pin)

      if (downloaders.length === 0) {
        break
      }

      yield * downloaders
    }
  }

  // Download an individial block.
  private async downloadSingle (cid: CID): Promise<BlockInfo> {
    // Check if we are already downloading this.
    const activePromise = this.activeDownloads.get(cid.toString())

    if (activePromise != null) {
      return activePromise
    }

    const promise = this.downloadSingleWithoutCache(cid)

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

  private async downloadSingleWithoutCache (cid: CID): Promise<BlockInfo> {
    // Download the block and fetch the downloads referencing it.
    const [downloads, block] = await Promise.all([
      all(this.downloads.allByCid(cid)),
      this.helia.blockstore.get(cid, { signal: AbortSignal.timeout(10000) })
    ])

    await addBlockRefs(this.helia, cid, downloads.map(d => d.pinnedBy))

    // Save the blocks to the database.
    await Promise.all(downloads.map(async d => this.blocks.getOrPut(d.pinnedBy, cid, {
      depth: d.depth,
      size: block.length,
      timestamp: Date.now()
    })))

    // Add the next blocks to downloads.
    const dagWalker = getWalker(cid)
    const links: CID[] = [...dagWalker.walk(block)]

    await this.addToDownloads(links, downloads)

    // Delete the download references
    await Promise.all(downloads.map(async d => this.downloads.delete(d.pinnedBy, d.cid)))

    this.events.dispatchEvent(new CIDEvent('downloads:added', cid))

    return { cid, links }
  }

  private async addToDownloads (cids: CID[], downloads: Array<{ depth: number, pinnedBy: CID }>): Promise<void> {
    const promises: Array<Promise<unknown>> = []

    await Promise.all(cids.map(cid => downloads.map(async d => {
      const pin = await this.pins.get(d.pinnedBy)

      if (pin?.depth != null && pin.depth <= d.depth) {
        return
      }

      await this.downloads.getOrPut(d.pinnedBy, cid, { depth: d.depth + 1 })
    })).reduce((a, c) => [...a, ...c], []))

    await Promise.all(promises)
  }
}
