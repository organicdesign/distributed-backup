import Path from 'path'
import { unixfs } from '@helia/unixfs'
import * as dagCbor from '@ipld/dag-cbor'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { take } from 'streaming-iterables'
import { EncodedEntry, type Components, VERSION_KEY, DATA_KEY } from './interface.js'
import { OperationManager } from './operation-manager.js'
import selectRevisions from './select-revisions.js'
import { decodeEntry, encodeEntry, getDagSize } from './utils.js'
import type { Datastore } from 'interface-datastore'

type OpComponents = Pick<Components, 'pinManager' | 'libp2p' | 'groups' | 'blockstore' | 'helia'> & { datastore: Datastore }

export default async (components: OpComponents): Promise<OperationManager<{
  put(groupData: Uint8Array, path: string, encodedEntry: NonNullable<EncodedEntry>): Promise<void>
  delete(groupData: Uint8Array, path: string): Promise<void>
}>> => {
  const put = async (groupData: Uint8Array, path: string, encodedEntry: NonNullable<EncodedEntry>): Promise<void> => {
    const group = CID.decode(groupData)
    const entry = decodeEntry(encodedEntry)
    const database = components.groups.get(group)
    let sequence = 0

    if (database == null) {
      throw new Error('unable to get group')
    }

    const obj = await database.store.selectors.get(database.store.index)(
      Path.join(DATA_KEY, path)
    )

    const data = EncodedEntry.parse(obj ?? null)

    if (data != null) {
      const entry = decodeEntry(data)

      if (entry?.sequence != null) {
        sequence = entry.sequence + 1
      }
    }

    entry.sequence = sequence

    await components.pinManager.process(group, path, dagCbor.encode(encodeEntry(entry)), true)

    const paths = [
      Path.join(DATA_KEY, path),
      Path.join(VERSION_KEY, path, components.libp2p.peerId.toString(), entry.sequence.toString())
    ]

    for (const path of paths) {
      await components.groups.addTo(group, path, entry)
    }

    // Handle revisions.
    const index = database.store.index

    const rawRevisions = await all(index.query({ prefix: Path.join('/', VERSION_KEY, path) }))

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

      await components.groups.deleteFrom(group, path)
      await components.pinManager.remove(group, path)
    }
  }

  const om = new OperationManager(components.datastore, {
    put,

    delete: async (groupData: Uint8Array, path: string) => {
      const group = CID.decode(groupData)
      const database = components.groups.get(group)

      if (database == null) {
        throw new Error('no such group')
      }

      const index = database.store.index
      const key = Path.join('/', DATA_KEY, path)
      const parentPath = key.split('/').slice(0, -2).join('/')
      const fs = unixfs(components.helia)
      const cid = await fs.addBytes(new Uint8Array([]))
      const { blocks, size } = await getDagSize(components.blockstore, cid)

      await components.groups.deleteFrom(group, key)
      await components.pinManager.remove(group, key)

      const values = await all(take(1)(index.query({ prefix: parentPath })))

      if (values.filter(v => v.key.toString() !== key).length === 0) {
        await put(groupData, Path.join(parentPath.replace(`/${DATA_KEY}`, ''), '.PLACE_HOLDER'), encodeEntry({
          cid,
          author: components.libp2p.peerId.toCID(),
          encrypted: false,
          blocks,
          size,
          timestamp: Date.now(),
          priority: 100,
          sequence: 0,
          revisionStrategy: 'none'
        }))
      }
    }
  })

  await om.start()

  return om
}
