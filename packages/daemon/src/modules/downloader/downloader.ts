import parallel from 'it-parallel'
import { pipe } from 'it-pipe'
import { type CID } from 'multiformats/cid'
import { collect } from 'streaming-iterables'
import { linearWeightTranslation } from './utils.js'
import { type Provides, logger } from './index.js'

export default async (context: Provides, options?: { signal: AbortSignal }): Promise<void> => {
  const batchDownload = async function * (itr: AsyncIterable<[CID, number]>): AsyncGenerator<() => Promise<{ cid: CID, block: Uint8Array }>, void, undefined> {
    for await (const [cid, priority] of itr) {
      if (options?.signal.aborted === true) {
        return
      }

      const weight = Math.floor(linearWeightTranslation(priority / 100) * context.config.slots) + 1
      const downloaders = await context.pinManager.download(cid, { limit: weight })

      yield * downloaders
    }
  }

  const catcher = async function * <T = unknown>(itr: AsyncIterable<T>): AsyncIterable<T> {
    try {
      yield * itr
    } catch (error) {
      logger.warn('downloader threw: ', error)
      yield * catcher(itr)
    }
  }

  const loop = async function * (): AsyncGenerator<undefined> {
    for (;;) {
      if (options?.signal.aborted === true) {
        return
      }

      await new Promise(resolve => setTimeout(resolve, 100))
      yield
    }
  }

  const getPins = async function * (loop: AsyncIterable<void>): AsyncGenerator<[CID, number]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of loop) {
      for await (const { value } of context.pinManager.getActive()) {
        if (options?.signal.aborted === true) {
          return
        }

        yield [value.cid, value.priority]
      }
    }
  }

  for (;;) {
    if (options?.signal.aborted === true) {
      return
    }

    await pipe(
      loop,
      getPins,
      batchDownload,
      i => parallel(i, { concurrency: context.config.slots, ordered: false }),
      i => catcher(i),
      async i => collect(i)
    )

    await new Promise(resolve => setTimeout(resolve, 100))
  }
}
