import Path from 'path'
import { unixfs } from '@helia/unixfs'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { take } from 'streaming-iterables'
import { type EncodedEntry, type Entry } from './interface.js'
import selectRevisions from './select-revisions.js'
import { decodeEntry, encodeEntry, getDagSize, createDataKey, createVersionKey, stripPrefix } from './utils.js'
import type { Requires, Provides } from './index.js'
import type { Pair } from '@/interface.js'
import type { Datastore } from 'interface-datastore'
import { OperationManager } from '@/operation-manager.js'

export default async (context: Pick<Provides, 'getFileSystem'>, { network, base, downloader }: Requires, datastore: Datastore): Promise<OperationManager<{
  put(groupData: Uint8Array, path: string, encodedEntry: NonNullable<EncodedEntry>): Promise<void>
  delete(groupData: Uint8Array, path: string): Promise<Array<Pair<string, Entry>>>
}>> => {
  const put = async (groupData: Uint8Array, path: string, encodedEntry: NonNullable<EncodedEntry>): Promise<void> => {
    const entry = decodeEntry(encodedEntry)
    const fs = context.getFileSystem(CID.decode(groupData))
    let sequence = 0

    if (fs == null) {
      throw new Error('unable to get group')
    }

    const existing = await fs.get(createDataKey(path))

    if (existing != null) {
      sequence = existing.sequence + 1
    }

    entry.sequence = sequence

    const paths = [
      createDataKey(path),
      createVersionKey(path, network.libp2p.peerId, entry.sequence)
    ]

    for (const path of paths) {
      await fs.put(path, entry)
      await downloader.pinManager.put(path, { cid: entry.cid, priority: entry.priority }, true)
    }

    // Handle revisions.
    const revisions = await all(fs.getDir(createVersionKey(path)))

    // Filter revisions.
    const selectedRevisions = selectRevisions(revisions, entry.revisionStrategy)

    for (const { key: path } of revisions) {
      const hasSelectedOld = selectedRevisions.find(r => r.key === path) != null

      if (hasSelectedOld) {
        continue
      }

      await fs.delete(path)
    }
  }

  const om = new OperationManager(datastore, {
    put,

    async delete (groupData: Uint8Array, path: string) {
      const fs = context.getFileSystem(CID.decode(groupData))

      if (fs == null) {
        throw new Error('no such group')
      }

      const key = createDataKey(path)
      const parentPath = key.split('/').slice(0, -2).join('/')
      const ufs = unixfs(network.helia)
      const cid = await ufs.addBytes(new Uint8Array([]))
      const { blocks, size } = await getDagSize(base.blockstore, cid)

      const pairs = await all(fs.getDir(key))

      await Promise.all(pairs.map(async p => fs.delete(p.key.toString())))

      const values = await all(take(1)(fs.getDir(parentPath)))

      if (values.filter(v => v.key.toString() !== key).length === 0) {
        await put(groupData, Path.join(stripPrefix(parentPath), '.PLACE_HOLDER'), encodeEntry({
          cid,
          author: network.libp2p.peerId.toCID(),
          encrypted: false,
          blocks,
          size,
          timestamp: Date.now(),
          priority: 100,
          sequence: 0,
          revisionStrategy: 'none'
        }))
      }

      return pairs
    }
  })

  await om.start()

  return om
}
