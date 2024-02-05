import Path from 'path'
import { unixfs } from '@helia/unixfs'
import { CID } from 'multiformats/cid'
import { collect } from 'streaming-iterables'
import { concat as uint8ArrayConcat } from 'uint8arrays/concat'
import { toString as uint8ArrayToString } from 'uint8arrays/to-string'
import { z } from 'zod'
import { DATA_KEY } from '../../interface.js'
import { type Components, type EncodedEntry, zCID } from '../../interface.js'
import { decodeEntry } from '../../utils.js'

export const name = 'read'

const Params = z.object({
  group: zCID,
  path: z.string(),
  position: z.number().int(),
  length: z.number().int()
})

export const method = (components: Components) => async (raw: unknown) => {
  const params = Params.parse(raw)
  const group = components.groups.get(CID.parse(params.group))

  if (group == null) {
    throw new Error('no such group')
  }

  const key = Path.join('/', DATA_KEY, params.path)
  const encodedEntry = await group.store.selectors.get(group.store.index)(key) as EncodedEntry

  if (encodedEntry == null) {
    throw new Error(`no such item: ${key}`)
  }

  const entry = decodeEntry(encodedEntry)
  const fs = unixfs(components.helia)

  return uint8ArrayToString(uint8ArrayConcat(await collect(fs.cat(entry.cid, { offset: params.position, length: params.length }))))
}
