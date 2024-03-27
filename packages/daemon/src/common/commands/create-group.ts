import { CreateGroup } from '@organicdesign/db-rpc-interfaces'
import { fromString as uint8ArrayFromString } from 'uint8arrays'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod = ({ net, welo, groups }) => {
  net.rpc.addMethod(CreateGroup.name, async (raw: unknown): Promise<CreateGroup.Return> => {
    const params = CreateGroup.Params.parse(raw)
    const peerValues = params.peers.map(p => uint8ArrayFromString(p, 'base58btc'))

    const manifest = await welo.determine({
      name: params.name,
      meta: { type: 'group' },
      access: {
        protocol: '/hldb/access/static',
        config: { write: [welo.identity.id, ...peerValues] }
      }
    })

    await groups.add(manifest)

    return manifest.address.cid.toString()
  })
}

export default command
