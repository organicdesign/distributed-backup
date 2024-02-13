import { unixfs } from '@helia/unixfs'
import * as dagCbor from '@ipld/dag-cbor'
import { CID } from 'multiformats/cid'
import { Write } from 'rpc-interfaces'
import { fromString as uint8ArrayFromString } from 'uint8arrays/from-string'
import { decodeEntry, encodeEntry, getDagSize, createDataKey } from '../utils.js'
import type { Components, EncodedEntry, Entry } from '../interface.js'

export const name = 'write'

export const method = (components: Components) => async (raw: unknown): Promise<Write.Return> => {
  const params = Write.Params.parse(raw)
  const group = CID.parse(params.group)
  const database = components.groups.get(group)

  if (database == null) {
    throw new Error('no such group')
  }

  const key = createDataKey(params.path)
  const encodedEntry = await database.store.selectors.get(database.store.index)(key) as EncodedEntry
  const entry: Partial<Entry> = encodedEntry == null ? {} : decodeEntry(encodedEntry)
  const fs = unixfs(components.helia)
  const cid = await fs.addBytes(uint8ArrayFromString(params.data))
  const { blocks, size } = await getDagSize(components.blockstore, cid)

  const newEncodedEntry = encodeEntry({
    cid,
    author: components.libp2p.peerId.toCID(),
    encrypted: false,
    blocks,
    size,
    timestamp: Date.now(),
    priority: entry?.priority ?? 100,
    sequence: entry?.sequence != null ? entry.sequence + 1 : 0,
    revisionStrategy: entry.revisionStrategy ?? components.config.defaultRevisionStrategy
  })

  const put = database.store.creators.put(key, newEncodedEntry)

  await database.replica.write(put)
  await components.pinManager.process(group, key, dagCbor.encode(newEncodedEntry), true)

  return params.data.length
}
