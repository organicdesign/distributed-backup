import { type CID } from 'multiformats/cid'
import type { Groups } from '../../src/common/groups.js'
import type { Welo } from 'welo'

export const createGroup = async (groups: Groups, welo: Welo, name: string, peers: Uint8Array[] = []): Promise<CID> => {
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
