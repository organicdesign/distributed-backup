import Path from 'path'
import * as dagCbor from '@ipld/dag-cbor'
import { CID } from 'multiformats/cid'
import { Revisions } from 'rpc-interfaces'
import { VERSION_KEY, type Components, EncodedEntry } from '../../interface.js'
import { countPeers, decodeAny } from '../../utils.js'

export const name = 'revisions'

export const method = (components: Components) => async (raw: unknown): Promise<Revisions.Return> => {
  const params = Revisions.Params.parse(raw)

  const promises: Array<Promise<Revisions.Return[number]>> = []

  const database = components.groups.get(CID.parse(params.group))

  if (database == null) {
    throw new Error('no such group')
  }

  const index = await database.store.latest()

  for await (const pair of index.query({ prefix: Path.join('/', VERSION_KEY, params.path) })) {
    // Ignore null values...
    if (decodeAny(pair.value) == null) {
      continue
    }

    const entry = EncodedEntry.optional().parse(dagCbor.decode(pair.value))

    if (entry == null) {
      continue
    }

    const item = CID.decode(entry.cid)

    const keyParts = pair.key.toString().split('/')
    const sequence = keyParts.pop()
    const author = keyParts.pop()

    if (sequence == null || author == null) {
      throw new Error('corrupted database')
    }

    promises.push((async () => {
      return {
        cid: item.toString(),
        peers: await countPeers(components, item, { timeout: 3000 }),
        encrypted: entry.encrypted,
        author,
        sequence: Number(sequence),
        timestamp: entry.timestamp,
        size: entry.size,
        blocks: entry.blocks
      }
    })())
  }

  return Promise.all(promises)
}
