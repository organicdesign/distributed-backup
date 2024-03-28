import { type CID } from 'multiformats/cid'
import type { Components } from '../../src/common/interface.js'

export const createGroup = async ({ welo, groups }: Components, name: string, peers: Uint8Array[] = []): Promise<CID> => {
  const manifest = await welo.determine({
    name,
    meta: { type: 'group' },
    access: {
      protocol: '/hldb/access/static',
      config: { write: [welo.identity.id, ...peers] }
    }
  })

  await groups.add(manifest)

  return manifest.address.cid
}
