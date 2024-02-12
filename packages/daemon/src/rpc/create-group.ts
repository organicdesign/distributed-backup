import { CreateGroup } from 'rpc-interfaces'
import { fromString as uint8ArrayFromString } from 'uint8arrays'
import type { Components } from '../interface.js'

export const name = 'create-group'

export const method = (components: Components) => async (raw: unknown): Promise<CreateGroup.Return> => {
  const params = CreateGroup.Params.parse(raw)
  const peerValues = params.peers.map(p => uint8ArrayFromString(p, 'base58btc'))

  const manifest = await components.welo.determine({
    name: params.name,
    meta: { type: 'group' },
    access: {
      protocol: '/hldb/access/static',
      config: { write: [components.welo.identity.id, ...peerValues] }
    }
  })

  await components.groups.add(manifest)

  return manifest.address.cid.toString()
}
