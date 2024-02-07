import parallel from 'it-parallel'
import { pipe } from 'it-pipe'
import * as logger from 'logger'
import { type CID } from 'multiformats/cid'
import { collect } from 'streaming-iterables'
import { type Components, EncodedEntry } from './interface.js'
import syncGroups from './sync-groups.js'
import { linearWeightTranslation, decodeEntry } from './utils.js'

export const syncLoop = async (components: Components): Promise<void> => {
  await syncGroups(components)
}

export const downloadLoop = async (components: Components): Promise<void> => {
  // logger.tick("STARTED");
  // logger.tick("GOT REMOTE CONTENTS");

  const SLOTS = 50

  const batchDownload = async function * (itr: AsyncIterable<[CID, number | undefined]>): AsyncGenerator<() => Promise<{ cid: CID, block: Uint8Array }>, void, undefined> {
    for await (const [cid, p] of itr) {
      const priority = p ?? 100
      const weight = Math.floor(linearWeightTranslation(priority / 100) * SLOTS) + 1

      const downloaders = await components.pinManager.download(cid, { limit: weight })

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

  const getPins = async function * (loop: AsyncIterable<void>): AsyncGenerator<[CID, number | undefined]> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    for await (const _ of loop) {
      for await (const { group, path } of components.pinManager.getActive()) {
        const database = components.groups.get(group)

        if (database == null) {
          logger.warn('Reverse lookup points to non-existant database: ', group)
          continue
        }

        const paily = database.store.index
        const data = await database.store.selectors.get(paily)(path)
        const encodedEntry = EncodedEntry.parse(data)

        if (encodedEntry == null) {
          continue
        }

        const entry = decodeEntry(encodedEntry)

        let priority: number = entry.priority

        if (path.startsWith('/r')) {
          const localRef = await components.localSettings.get(group, path.slice(2))

          if (localRef?.priority != null) {
            priority = localRef.priority
          }
        }

        yield [entry.cid, priority]
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