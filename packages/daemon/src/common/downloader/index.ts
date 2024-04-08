import parallel from 'it-parallel'
import { pipe } from 'it-pipe'
import { collect } from 'streaming-iterables'
import { Event, EventTarget } from 'ts-event-target'
import { linearWeightTranslation } from './utils.js'
import type { PinManager } from '../pin-manager/index.js'
import type { Startable } from '@libp2p/interface'
import type { CID } from 'multiformats/cid'

export class DownloadErrorEvent extends Event<'download:error'> {
  readonly error: Error

  constructor (error: Error) {
    super('download:error')

    this.error = error
  }
}

export class Downloader implements Startable {
  private readonly slots: number
  private readonly pinManager: PinManager
  private controller: AbortController = new AbortController()
  private loopPromise: Promise<void> | null = null
  readonly events = new EventTarget<[DownloadErrorEvent]>()

  constructor (pinManager: PinManager, slots: number) {
    this.slots = slots
    this.pinManager = pinManager
  }

  async start (): Promise<void> {
    await this.loopPromise
    this.controller = new AbortController()
    this.loopPromise = this.loop()
  }

  async stop (): Promise<void> {
    this.controller.abort()
    await this.loopPromise
  }

  private async loop (): Promise<void> {
    for (;;) {
      if (this.isAborted) {
        return
      }

      await pipe(
        () => this.delay(),
        i => this.getPins(i),
        i => this.batchDownload(i),
        i => parallel(i, { concurrency: this.slots, ordered: false }),
        i => this.catcher(i),
        async i => collect(i)
      )

      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }

  private async * batchDownload (itr: AsyncIterable<[CID, number]>): AsyncGenerator<() => Promise<{ cid: CID }>, void, undefined> {
    for await (const [cid, priority] of itr) {
      if (this.isAborted) {
        return
      }

      const weight = Math.floor(linearWeightTranslation(priority / 100) * this.slots) + 1
      const downloaders = await this.pinManager.download(cid, { limit: weight })

      yield * downloaders
    }
  }

  private async * catcher <T = unknown>(itr: AsyncIterable<T>): AsyncIterable<T> {
    try {
      yield * itr
    } catch (e) {
      const error = e instanceof Error ? e : new Error(JSON.stringify(e))

      this.events.dispatchEvent(new DownloadErrorEvent(error))

      yield * this.catcher(itr)
    }
  }

  private async * delay (): AsyncGenerator<undefined> {
    for (;;) {
      if (this.isAborted) {
        return
      }

      await new Promise(resolve => setTimeout(resolve, 100))
      yield
    }
  }

  async * getPins (loop: AsyncIterable<void>): AsyncGenerator<[CID, number]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of loop) {
      for await (const { value } of this.pinManager.getActive()) {
        if (this.isAborted) {
          return
        }

        yield [value.cid, value.priority]
      }
    }
  }

  private get isAborted (): boolean {
    return this.controller.signal.aborted
  }
}

export const createDownloader = async (pinManage: PinManager, slots: number): Promise<Downloader> => {
  const downloader = new Downloader(pinManage, slots)

  await downloader.start()

  return downloader
}
