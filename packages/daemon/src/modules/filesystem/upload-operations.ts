import Path from 'path'
import { unixfs } from '@helia/unixfs'
import * as dagCbor from '@ipld/dag-cbor'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { take } from 'streaming-iterables'
import { FileSystem } from './file-system.js'
import { EncodedEntry, type Entry } from './interface.js'
import selectRevisions from './select-revisions.js'
import { decodeEntry, encodeEntry, getDagSize, createDataKey, createVersionKey, stripPrefix } from './utils.js'
import type { Requires } from './index.js'
import type { PinManager } from './pin-manager.js'
import type { Pair } from '@/interface.js'
import type { Datastore } from 'interface-datastore'
import { OperationManager } from '@/operation-manager.js'

export default async ({ network, base, groups }: Requires, pinManager: PinManager, datastore: Datastore): Promise<OperationManager<{
  put(groupData: Uint8Array, path: string, encodedEntry: NonNullable<EncodedEntry>): Promise<void>
  delete(groupData: Uint8Array, path: string): Promise<Array<Pair<string, Entry>>>
}>> => {
  const put = async (groupData: Uint8Array, path: string, encodedEntry: NonNullable<EncodedEntry>): Promise<void> => {
    const group = CID.decode(groupData)
    const entry = decodeEntry(encodedEntry)
    const database = groups.groups.get(group)
    let sequence = 0

    if (database == null) {
      throw new Error('unable to get group')
    }

    const fs = new FileSystem(pinManager, database)

    const obj = await database.store.selectors.get(database.store.index)(
      createDataKey(path)
    )

    const data = EncodedEntry.parse(obj ?? null)

    if (data != null) {
      const entry = decodeEntry(data)

      if (entry?.sequence != null) {
        sequence = entry.sequence + 1
      }
    }

    entry.sequence = sequence

    const paths = [
      createDataKey(path),
      createVersionKey(path, network.libp2p.peerId, entry.sequence)
    ]

    for (const path of paths) {
      await fs.put(path, entry, true)
    }

    // Handle revisions.
    const index = database.store.index

    const rawRevisions = await all(index.query({
      prefix: createVersionKey(path)
    }))

    const revisions = rawRevisions.filter(r => dagCbor.decode(r.value) != null).map(r => ({
      value: EncodedEntry.parse(dagCbor.decode(r.value)),
      key: r.key.toString()
    }))

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
      const group = CID.decode(groupData)
      const database = groups.groups.get(group)

      if (database == null) {
        throw new Error('no such group')
      }

      const fs = new FileSystem(pinManager, database)
      const index = database.store.index
      const key = createDataKey(path)
      const parentPath = key.split('/').slice(0, -2).join('/')
      const ufs = unixfs(network.helia)
      const cid = await ufs.addBytes(new Uint8Array([]))
      const { blocks, size } = await getDagSize(base.blockstore, cid)

      const pairs = await all(index.query({ prefix: key }))

      await Promise.all(pairs.map(async p => fs.delete(p.key.toString())))

      const values = await all(take(1)(index.query({ prefix: parentPath })))

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

      return pairs.map(p => {
        const encodedEntry = EncodedEntry.parse(dagCbor.decode(p.value))

        if (encodedEntry == null) {
          return null
        }

        const entry = decodeEntry(encodedEntry)

        return {
          key: p.key.toString(),
          value: entry
        }
      }).filter(f => f != null) as Array<Pair<string, Entry>>
    }
  })

  await om.start()

  return om
}
