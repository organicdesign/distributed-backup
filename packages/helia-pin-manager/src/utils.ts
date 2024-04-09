import * as cborg from 'cborg'
import { type Datastore, Key } from 'interface-datastore'
import { base36 } from 'multiformats/bases/base36'
import { equals as uint8ArrayEquals } from 'uint8arrays'
import type { DatastorePin, DatastorePinnedBlock } from './interface.js'
import type { CID } from 'multiformats/cid'

export const addPinRef = async ({ datastore }: { datastore: Datastore }, cid: CID, options?: { depth?: number }): Promise<void> => {
  if (cid.version === 0) {
    cid = cid.toV1()
  }

  const pinKey = new Key(`/pin/${cid.toString(base36)}`)

  if (await datastore.has(pinKey)) {
    return
  }

  const depth = Math.round(options?.depth ?? Infinity)

  if (depth < 0) {
    throw new Error('Depth must be greater than or equal to 0')
  }

  const pin: DatastorePin = { depth, metadata: {} }

  await datastore.put(pinKey, cborg.encode(pin))
}

export const addBlockRefs = async ({ datastore }: { datastore: Datastore }, cid: CID, by: CID | CID[]): Promise<void> => {
  if (cid.version === 0) {
    cid = cid.toV1()
  }

  const pinnedBy = (Array.isArray(by) ? by : [by]).map(c => c.toV1().bytes)
  const blockKey = new Key(`/pinned-block/${base36.encode(cid.multihash.bytes)}`)

  let pinnedBlock: DatastorePinnedBlock = { pinCount: 0, pinnedBy: [] }

  try {
    pinnedBlock = cborg.decode(await datastore.get(blockKey))
  } catch (err: any) {
    if (err.code !== 'ERR_NOT_FOUND') {
      throw err
    }
  }

  const newReferences = pinnedBy.filter(by => {
    return pinnedBlock.pinnedBy.find(c => uint8ArrayEquals(c, by)) == null
  })

  pinnedBlock.pinCount += newReferences.length
  pinnedBlock.pinnedBy = [...pinnedBlock.pinnedBy, ...newReferences]

  await datastore.put(blockKey, cborg.encode(pinnedBlock))
}
