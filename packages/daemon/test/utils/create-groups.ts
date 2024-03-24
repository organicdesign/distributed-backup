import { type CID } from 'multiformats/cid'
import type { Provides as GroupsProvides } from '../../src/modules/groups/index.js'

export const createGroup = async (m: GroupsProvides, name: string, peers: Uint8Array[] = []): Promise<CID> => {
  const manifest = await m.welo.determine({
    name,
    meta: { type: 'group' },
    access: {
      protocol: '/hldb/access/static',
      config: { write: [m.welo.identity.id, ...peers] }
    }
  })

  await m.groups.add(manifest)

  return manifest.address.cid
}
