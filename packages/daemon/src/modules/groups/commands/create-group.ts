import { CreateGroup } from 'rpc-interfaces'
import { fromString as uint8ArrayFromString } from 'uint8arrays'
import type { Provides, Requires } from '../index.js'
import type { ModuleMethod } from '@/interface.js'

const command: ModuleMethod<Provides, Requires> = (context, { rpc }) => {
  rpc.addMethod(CreateGroup.name, async (raw: unknown): Promise<CreateGroup.Return> => {
    const params = CreateGroup.Params.parse(raw)
    const peerValues = params.peers.map(p => uint8ArrayFromString(p, 'base58btc'))

    const manifest = await context.welo.determine({
      name: params.name,
      meta: { type: 'group' },
      access: {
        protocol: '/hldb/access/static',
        config: { write: [context.welo.identity.id, ...peerValues] }
      }
    })

    await context.groups.add(manifest)

    return manifest.address.cid.toString()
  })
}

export default command
