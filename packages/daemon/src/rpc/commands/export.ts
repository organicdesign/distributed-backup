import Path from 'path'
import * as dagCbor from '@ipld/dag-cbor'
import { exportPlaintext } from 'fs-exporter'
import { CID } from 'multiformats/cid'
import { z } from 'zod'
import { DATA_KEY } from '../../interface.js'
import { type Components, EncodedEntry, zCID } from '../../interface.js'
import { decodeEntry } from '../../utils.js'

export const name = 'export'

const Params = z.object({
  path: z.string(),
  outPath: z.string(),
  group: zCID
})

export const method = (components: Components) => async (raw: unknown) => {
  const params = Params.parse(raw)
  const database = components.groups.get(CID.parse(params.group))

  if (database == null) {
    throw new Error('no such group')
  }

  const index = await database.store.latest()

  for await (const pair of index.query({ prefix: Path.join('/', DATA_KEY, params.path) })) {
    const encodedEntry = EncodedEntry.parse(dagCbor.decode(pair.value))

    if (encodedEntry == null) {
      continue
    }

    const entry = decodeEntry(encodedEntry)
    const virtualPath = pair.key.toString().replace('/r', '')

    await exportPlaintext(
      components.blockstore,
      Path.join(params.outPath, virtualPath.replace(params.path, '')),
      entry.cid
    )
  }
}
