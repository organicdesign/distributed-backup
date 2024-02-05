import Path from 'path'
import * as dagCbor from '@ipld/dag-cbor'
import { type Key } from 'interface-datastore'
import all from 'it-all'
import { CID } from 'multiformats/cid'
import { z } from 'zod'
import { type Components, zCID, EncodedEntry, DATA_KEY, type Pair } from '../../interface.js'
import { decodeEntry } from '../../utils.js'

export const name = 'query-group'

const Params = z.object({
  group: zCID
})

export const method = (components: Components) => async (raw: unknown) => {
  const params = Params.parse(raw)

  const database = components.groups.get(CID.parse(params.group))

  if (database == null) {
    throw new Error('no such group')
  }

  const index = await database.store.latest()
  const values = await all(index.query({ prefix: Path.join('/', DATA_KEY) }))

  const filteredValues = values
    .map(pair => ({ ...pair, value: EncodedEntry.parse(dagCbor.decode(pair.value)) }))
    .filter(pair => Boolean(pair.value)) as Array<Pair<Key, NonNullable<EncodedEntry>>>

  return filteredValues
    .map(pair => ({ ...pair, value: decodeEntry(pair.value) }))
    .map(pair => ({
      ...pair.value,
      cid: pair.value.cid.toString(),
      author: pair.value.author.toString(),
      path: pair.key.toString()
    }))
}
