import { CID } from 'multiformats/cid'
import { Delete } from 'rpc-interfaces'
import type { Components } from '../interface.js'

export const name = 'delete'

export const method = (components: Components) => async (raw: unknown): Promise<Delete.Return> => {
  const params = Delete.Params.parse(raw)
  const pairs = await components.uploads.add('delete', [CID.parse(params.group).bytes, params.path])

  return pairs.map(p => ({ path: p.key, cid: p.value.cid.toString() }))
}
