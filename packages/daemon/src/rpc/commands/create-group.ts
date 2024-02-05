import { fromString as uint8ArrayFromString } from 'uint8arrays'
import { z } from 'zod'
import type { Components } from '../../interface.js'

export const name = 'create-group'

const Params = z.object({
  name: z.string(),
  peers: z.array(z.string())
})

export const method = (components: Components) => async (raw: unknown) => {
  const params = Params.parse(raw)
  const peerValues = params.peers.map(p => uint8ArrayFromString(p, 'base64'))

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
