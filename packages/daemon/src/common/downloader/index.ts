import { anySignal } from 'any-signal'
import parallel from 'it-parallel'
import { pipe } from 'it-pipe'
import { collect } from 'streaming-iterables'
import { Event, EventTarget } from 'ts-event-target'
import { linearWeightTranslation } from './utils.js'
import type { PinManager } from '../pin-manager/index.js'
import type { PinInfo } from '../pin-manager/interface.js'
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
  private isPaused = false
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

  get paused (): boolean {
    return this.isPaused
  }

  pause (): void {
    this.isPaused = true
  }

  resume (): void {
    this.isPaused = false
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

  private async * batchDownload (itr: AsyncIterable<PinInfo>): AsyncGenerator<() => Promise<{ cid: CID }>, void, undefined> {
    for await (const { cid, priority } of itr) {
      if (this.isAborted || this.paused) {
        return
      }

      const weight = Math.floor(linearWeightTranslation(priority / 100) * this.slots) + 1

      const downloaders = await this.pinManager.download(cid, { limit: weight, signal: this.controller.signal })

      yield * downloaders.map(d => async () => d({
        signal: anySignal([this.controller.signal, AbortSignal.timeout(10000)])
      }))
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

  async * getPins (loop: AsyncIterable<void>): AsyncGenerator<PinInfo> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of loop) {
      for await (const { value } of this.pinManager.getActive(this.controller)) {
        if (this.isAborted || this.paused) {
          return
        }

        yield value
      }
    }
  }

  private get isAborted (): boolean {
    return this.controller.signal.aborted
  }
}

export const createDownloader = async (pinManager: PinManager, slots: number): Promise<Downloader> => {
  const downloader = new Downloader(pinManager, slots)

  await downloader.start()

  return downloader
}
