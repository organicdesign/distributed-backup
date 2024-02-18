import parallel from 'it-parallel'
import { pipe } from 'it-pipe'
import * as logger from 'logger'
import { type CID } from 'multiformats/cid'
import { collect } from 'streaming-iterables'
import type { Provides } from './index.js'
import { linearWeightTranslation } from './utils.js'

export default async (context: Provides): Promise<void> => {
  // logger.tick("STARTED");
  // logger.tick("GOT REMOTE CONTENTS");

  const SLOTS = 50

  const batchDownload = async function * (itr: AsyncIterable<[CID, number]>): AsyncGenerator<() => Promise<{ cid: CID, block: Uint8Array }>, void, undefined> {
    for await (const [cid, priority] of itr) {
      const weight = Math.floor(linearWeightTranslation(priority / 100) * SLOTS) + 1
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
      await new Promise(resolve => setTimeout(resolve, 100))
      yield
    }
  }

  const getPins = async function * (loop: AsyncIterable<void>): AsyncGenerator<[CID, number]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of loop) {
      for await (const { value } of context.pinManager.getActive()) {
        yield [value.cid, value.priority]
      }
    }
  }

  await pipe(
    loop,
    getPins,
    batchDownload,
    i => parallel(i, { concurrency: SLOTS, ordered: false }),
    i => catcher(i),
    async i => collect(i)
  )

  // logger.tick("FINISHED");
}
